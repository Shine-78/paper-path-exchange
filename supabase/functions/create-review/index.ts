
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

    const { 
      reviewer_id, 
      reviewed_user_id, 
      book_id, 
      purchase_request_id, 
      rating, 
      review_text, 
      review_type 
    } = await req.json();

    console.log('Creating review with data:', {
      reviewer_id, 
      reviewed_user_id, 
      book_id, 
      purchase_request_id, 
      rating, 
      review_text, 
      review_type
    });

    // Insert review
    const { data: reviewData, error: reviewError } = await supabaseService
      .from('reviews')
      .insert({
        reviewer_id,
        reviewed_user_id,
        book_id,
        purchase_request_id,
        rating,
        review_text,
        review_type
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Review insert error:', reviewError);
      throw reviewError;
    }

    console.log('Review created successfully:', reviewData);

    // Update user's average rating
    const { data: allReviews, error: reviewsError } = await supabaseService
      .from('reviews')
      .select('rating')
      .eq('reviewed_user_id', reviewed_user_id);

    if (reviewsError) {
      console.error('Error fetching reviews for rating calculation:', reviewsError);
    } else if (allReviews && allReviews.length > 0) {
      const average = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;
      
      const { error: updateError } = await supabaseService
        .from('profiles')
        .update({ 
          average_rating: Math.round(average * 10) / 10,
          review_count: allReviews.length
        })
        .eq('id', reviewed_user_id);

      if (updateError) {
        console.error('Error updating user rating:', updateError);
      } else {
        console.log(`Updated user ${reviewed_user_id} rating to ${average} with ${allReviews.length} reviews`);
      }
    }

    return new Response(JSON.stringify({ success: true, review: reviewData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
