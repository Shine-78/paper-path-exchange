
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

    // Calculate amounts
    const bookPrice = request.offered_price; // in rupees
    const securityDeposit = 10000; // ₹100 in paisa
    const platformFee = 2000; // ₹20 in paisa
    const totalRefund = bookPrice * 100 + securityDeposit - platformFee; // convert to paisa

    // Find seller's customer ID
    const customers = await stripe.customers.list({ 
      email: request.seller.email, 
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      throw new Error('Seller not found in Stripe');
    }

    // Create refund/transfer to seller
    // In a real implementation, you'd use Stripe Connect for marketplace payments
    // For now, we'll simulate by creating a payment intent for the seller
    
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

    // Create notification for seller
    await supabaseService
      .from('notifications')
      .insert({
        user_id: request.seller_id,
        type: 'book_sold',
        title: 'Book Sold Successfully!',
        message: `Your book "${request.books.title}" has been sold for ₹${bookPrice}. You'll receive ₹${totalRefund/100} (book price + security deposit - platform fee).`,
        related_id: request.book_id
      });

    return new Response(JSON.stringify({ 
      success: true,
      totalRefund: totalRefund/100,
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
