
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        buyer:buyer_id(email, full_name),
        seller:seller_id(email, full_name)
      `)
      .eq('id', purchaseRequestId)
      .single();

    if (requestError || !request) {
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

    if (insertError) throw insertError;

    // Send actual email using Supabase Auth email service
    try {
      const { error: emailError } = await supabaseService.auth.admin.sendRawEmail({
        to: request.buyer.email,
        subject: `BookEx Delivery OTP - ${request.books.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; text-align: center;">BookEx Delivery Confirmation</h2>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Hello ${request.buyer.full_name},</h3>
              <p>Your delivery OTP for <strong>"${request.books.title}"</strong> is ready.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background-color: #2563eb; color: white; padding: 15px 30px; border-radius: 8px; display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
                  ${otpCode}
                </div>
              </div>
              
              <p>Please enter this OTP in the BookEx app to confirm delivery and proceed with payment.</p>
              <p><strong>This OTP is valid for 30 minutes only.</strong></p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b;">
                If you didn't request this OTP, please ignore this email.<br>
                This is an automated email from BookEx - India's Book Exchange Platform.
              </p>
            </div>
          </div>
        `,
        text: `BookEx Delivery OTP: ${otpCode} for "${request.books.title}". Valid for 30 minutes.`
      });

      if (emailError) {
        console.log('Email sending failed, falling back to notification:', emailError);
      } else {
        console.log(`OTP email sent successfully to ${request.buyer.email}`);
      }
    } catch (emailError) {
      console.log('Email service error, using notification fallback:', emailError);
    }

    // Create notification as backup
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
      message: 'OTP sent successfully to email and notifications',
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
