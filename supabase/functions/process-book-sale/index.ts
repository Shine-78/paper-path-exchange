
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

    const { purchaseRequestId } = await req.json();
    
    // Get purchase request details
    const { data: request, error: requestError } = await supabaseService
      .from('purchase_requests')
      .select(`
        *,
        books!inner(*, profiles!seller_id(*)),
        buyer:buyer_id(email),
        seller:seller_id(email)
      `)
      .eq('id', purchaseRequestId)
      .single();

    if (requestError || !request) {
      throw new Error('Purchase request not found');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Calculate amounts with new payment structure
    const bookPrice = request.offered_price; // in rupees
    const securityDeposit = 5000; // ₹50 in paisa (updated)
    const platformFee = 2000; // ₹20 in paisa
    const sellerRefund = 3000; // ₹30 in paisa (new structure)
    const totalSellerPayout = bookPrice * 100 + sellerRefund; // book price + ₹30 refund

    // Find seller's customer ID
    const customers = await stripe.customers.list({ 
      email: request.seller.email, 
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      throw new Error('Seller not found in Stripe');
    }

    // Update book status to sold
    await supabaseService
      .from('books')
      .update({ status: 'sold' })
      .eq('id', request.book_id);

    // Update purchase request status
    await supabaseService
      .from('purchase_requests')
      .update({ status: 'completed' })
      .eq('id', purchaseRequestId);

    // Create notification for seller with updated amounts
    await supabaseService
      .from('notifications')
      .insert({
        user_id: request.seller_id,
        type: 'book_sold',
        title: 'Book Sold Successfully!',
        message: `Your book "${request.books.title}" has been sold for ₹${bookPrice}. You'll receive ₹${totalSellerPayout/100} (book price ₹${bookPrice} + security refund ₹30). Platform fee: ₹20.`,
        related_id: request.book_id,
        priority: 'high'
      });

    // Create notification for buyer
    await supabaseService
      .from('notifications')
      .insert({
        user_id: request.buyer_id,
        type: 'purchase_confirmed',
        title: 'Purchase Confirmed!',
        message: `Your purchase of "${request.books.title}" for ₹${bookPrice} has been confirmed. Contact the seller to arrange pickup/delivery.`,
        related_id: request.book_id,
        priority: 'high'
      });

    return new Response(JSON.stringify({ 
      success: true,
      sellerPayout: totalSellerPayout/100,
      platformFee: platformFee/100,
      message: 'Book sale processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error processing book sale:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
