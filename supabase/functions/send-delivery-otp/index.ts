
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

    // In a real implementation, you would send an actual email here
    // For now, we'll create a notification for the buyer
    await supabaseService
      .from('notifications')
      .insert({
        user_id: request.buyer_id,
        type: 'delivery_otp',
        title: 'Delivery OTP Code',
        message: `Your delivery OTP for "${request.books.title}" is: ${otpCode}. Please confirm delivery to proceed with payment.`,
        related_id: purchaseRequestId,
        priority: 'high'
      });

    console.log(`OTP ${otpCode} sent for purchase request ${purchaseRequestId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'OTP sent successfully',
      otp: otpCode // In production, remove this - only for testing
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
