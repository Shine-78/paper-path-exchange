
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

    const { purchaseRequestId, paymentMethod, buyerConfirmed, sellerConfirmed } = await req.json();
    
    // Get delivery confirmation and purchase request details
    const { data: confirmation, error: confirmationError } = await supabaseService
      .from('delivery_confirmations')
      .select(`
        *,
        purchase_requests!inner(*, books!inner(title, price_range), buyer:buyer_id(email), seller:seller_id(email))
      `)
      .eq('purchase_request_id', purchaseRequestId)
      .single();

    if (confirmationError || !confirmation) {
      throw new Error('Delivery confirmation not found');
    }

    // Update confirmation status
    const updates: any = {};
    if (buyerConfirmed !== undefined) {
      updates.buyer_confirmed_delivery = buyerConfirmed;
      updates.buyer_confirmed_payment = buyerConfirmed;
    }
    if (sellerConfirmed !== undefined) {
      updates.seller_confirmed_delivery = sellerConfirmed;
      updates.seller_confirmed_payment = sellerConfirmed;
    }
    if (paymentMethod) {
      updates.payment_method = paymentMethod;
    }

    await supabaseService
      .from('delivery_confirmations')
      .update(updates)
      .eq('id', confirmation.id);

    // Check if both parties have confirmed
    const bothConfirmed = (updates.buyer_confirmed_payment ?? confirmation.buyer_confirmed_payment) && 
                         (updates.seller_confirmed_payment ?? confirmation.seller_confirmed_payment);

    if (bothConfirmed && !confirmation.final_payout_processed) {
      // Process final payout
      const bookPrice = confirmation.purchase_requests.offered_price;
      const sellerBonus = 30; // ₹30 bonus from BookEx
      const totalSellerPayout = bookPrice + sellerBonus;

      // Mark as processed
      await supabaseService
        .from('delivery_confirmations')
        .update({ final_payout_processed: true })
        .eq('id', confirmation.id);

      // Update purchase request to completed
      await supabaseService
        .from('purchase_requests')
        .update({ status: 'completed' })
        .eq('id', purchaseRequestId);

      // Create notifications
      await supabaseService
        .from('notifications')
        .insert([
          {
            user_id: confirmation.seller_id,
            type: 'payout_processed',
            title: 'Payment Completed!',
            message: `Transaction completed for "${confirmation.purchase_requests.books.title}". You'll receive ₹${totalSellerPayout} (₹${bookPrice} + ₹${sellerBonus} BookEx bonus).`,
            related_id: purchaseRequestId,
            priority: 'high'
          },
          {
            user_id: confirmation.buyer_id,
            type: 'transaction_complete',
            title: 'Transaction Completed!',
            message: `Your purchase of "${confirmation.purchase_requests.books.title}" is now complete. Thank you for using BookEx!`,
            related_id: purchaseRequestId,
            priority: 'high'
          }
        ]);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Final payout processed successfully',
        sellerPayout: totalSellerPayout
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Confirmation updated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
