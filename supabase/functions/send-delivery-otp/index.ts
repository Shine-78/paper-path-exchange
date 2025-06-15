
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { purchaseRequestId } = await req.json();
    
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Get purchase request details
    const { data: request, error: requestError } = await supabaseService
      .from('purchase_requests')
      .select(`
        *,
        books!inner(title),
        buyer:profiles!purchase_requests_buyer_id_fkey(email, full_name),
        seller:profiles!purchase_requests_seller_id_fkey(email, full_name)
      `)
      .eq('id', purchaseRequestId)
      .single();

    if (requestError || !request) {
      console.error('Purchase request error:', requestError);
      throw new Error('Purchase request not found');
    }

    // Create delivery confirmation record
    const { error: insertError } = await supabaseService
      .from('delivery_confirmations')
      .insert({
        purchase_request_id: purchaseRequestId,
        buyer_id: request.buyer_id,
        seller_id: request.seller_id,
        otp_code: otpCode
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Send OTP via email using Resend
    if (request.buyer?.email) {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'BookEx <onboarding@resend.dev>',
        to: [request.buyer.email],
        subject: `Your Delivery OTP for "${request.books.title}"`,
        html: `
          <h1>Delivery Confirmation OTP</h1>
          <p>Hello ${request.buyer.full_name || 'there'},</p>
          <p>Your one-time password (OTP) to confirm the delivery of "<strong>${request.books.title}</strong>" is:</p>
          <h2 style="font-size: 24px; letter-spacing: 2px; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 5px;">${otpCode}</h2>
          <p>This code is valid for 30 minutes. Please provide it to the seller to complete the delivery process.</p>
          <p>If you did not request this, please ignore this email.</p>
          <br/>
          <p>Thanks,</p>
          <p>The BookEx Team</p>
        `
      });
      if (emailError) {
        console.error('Resend email error:', emailError);
        // We will not throw an error, so the user can still get the in-app notification
      } else {
        console.log('OTP Email sent successfully:', emailData);
      }
    } else {
      console.warn('Buyer email not found for OTP, skipping email notification.');
    }

    // Create notification for buyer
    await supabaseService
      .from('notifications')
      .insert({
        user_id: request.buyer_id,
        type: 'delivery_otp',
        title: 'Delivery OTP Code',
        message: `Your delivery OTP for "${request.books.title}" is: ${otpCode}. Please confirm delivery to proceed with payment. Valid for 30 minutes.`,
        related_id: purchaseRequestId,
        priority: 'high'
      });

    console.log(`OTP ${otpCode} sent for purchase request ${purchaseRequestId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'OTP sent successfully to your email and notifications.',
      otp: otpCode // Remove this in production
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

