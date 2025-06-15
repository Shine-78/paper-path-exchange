
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

    const { purchaseRequestId, otpCode } = await req.json();
    
    // Verify OTP
    const { data: confirmation, error: confirmationError } = await supabaseService
      .from('delivery_confirmations')
      .select('*')
      .eq('purchase_request_id', purchaseRequestId)
      .eq('otp_code', otpCode)
      .is('otp_verified_at', null)
      .single();

    if (confirmationError || !confirmation) {
      throw new Error('Invalid or expired OTP');
    }

    // Check if OTP is not older than 10 minutes
    const otpAge = Date.now() - new Date(confirmation.otp_sent_at).getTime();
    if (otpAge > 10 * 60 * 1000) {
      throw new Error('OTP has expired');
    }

    // Mark OTP as verified
    const { error: updateError } = await supabaseService
      .from('delivery_confirmations')
      .update({ otp_verified_at: new Date().toISOString() })
      .eq('id', confirmation.id);

    if (updateError) throw updateError;

    // Create notification for both users
    const { data: request } = await supabaseService
      .from('purchase_requests')
      .select('buyer_id, seller_id, books!inner(title)')
      .eq('id', purchaseRequestId)
      .single();

    if (request) {
      // Notify buyer
      await supabaseService
        .from('notifications')
        .insert({
          user_id: request.buyer_id,
          type: 'otp_verified',
          title: 'Delivery Confirmed',
          message: `Delivery OTP verified for "${request.books.title}". Please confirm delivery and payment.`,
          related_id: purchaseRequestId,
          priority: 'high'
        });

      // Notify seller
      await supabaseService
        .from('notifications')
        .insert({
          user_id: request.seller_id,
          type: 'otp_verified',
          title: 'Buyer Confirmed Delivery',
          message: `Buyer has confirmed delivery for "${request.books.title}". Please confirm payment receipt.`,
          related_id: purchaseRequestId,
          priority: 'high'
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'OTP verified successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
