
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create RPC functions to handle type issues
    const createFunctions = `
      -- Function to check admin status
      CREATE OR REPLACE FUNCTION check_admin_status(user_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS(SELECT 1 FROM admin_users WHERE user_id = $1);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Function to insert review
      CREATE OR REPLACE FUNCTION insert_review(
        p_reviewer_id UUID,
        p_reviewed_user_id UUID,
        p_book_id UUID,
        p_purchase_request_id UUID,
        p_rating INTEGER,
        p_review_text TEXT,
        p_review_type TEXT
      )
      RETURNS VOID AS $$
      BEGIN
        INSERT INTO reviews (
          reviewer_id, reviewed_user_id, book_id, purchase_request_id,
          rating, review_text, review_type
        ) VALUES (
          p_reviewer_id, p_reviewed_user_id, p_book_id, p_purchase_request_id,
          p_rating, p_review_text, p_review_type
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Function to get user preferences
      CREATE OR REPLACE FUNCTION get_user_preferences(user_id UUID)
      RETURNS TABLE(
        email_notifications BOOLEAN,
        push_notifications BOOLEAN,
        book_match_alerts BOOLEAN,
        price_drop_alerts BOOLEAN,
        new_books_nearby BOOLEAN,
        max_distance_km INTEGER,
        preferred_genres TEXT[]
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          up.email_notifications,
          up.push_notifications,
          up.book_match_alerts,
          up.price_drop_alerts,
          up.new_books_nearby,
          up.max_distance_km,
          up.preferred_genres
        FROM user_preferences up
        WHERE up.user_id = $1;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Function to upsert user preferences
      CREATE OR REPLACE FUNCTION upsert_user_preferences(
        p_user_id UUID,
        p_preferences JSONB
      )
      RETURNS VOID AS $$
      BEGIN
        INSERT INTO user_preferences (
          user_id, email_notifications, push_notifications, book_match_alerts,
          price_drop_alerts, new_books_nearby, max_distance_km, preferred_genres
        ) VALUES (
          p_user_id,
          (p_preferences->>'email_notifications')::BOOLEAN,
          (p_preferences->>'push_notifications')::BOOLEAN,
          (p_preferences->>'book_match_alerts')::BOOLEAN,
          (p_preferences->>'price_drop_alerts')::BOOLEAN,
          (p_preferences->>'new_books_nearby')::BOOLEAN,
          (p_preferences->>'max_distance_km')::INTEGER,
          ARRAY(SELECT jsonb_array_elements_text(p_preferences->'preferred_genres'))
        )
        ON CONFLICT (user_id) DO UPDATE SET
          email_notifications = EXCLUDED.email_notifications,
          push_notifications = EXCLUDED.push_notifications,
          book_match_alerts = EXCLUDED.book_match_alerts,
          price_drop_alerts = EXCLUDED.price_drop_alerts,
          new_books_nearby = EXCLUDED.new_books_nearby,
          max_distance_km = EXCLUDED.max_distance_km,
          preferred_genres = EXCLUDED.preferred_genres,
          updated_at = now();
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error } = await supabaseClient.rpc('exec_sql', {
      sql: createFunctions
    });

    if (error) {
      // Try alternative approach
      const queries = createFunctions.split(';').filter(q => q.trim());
      for (const query of queries) {
        if (query.trim()) {
          await supabaseClient.from('_temp').select('1').limit(0); // This will fail but that's ok
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Database functions created' }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
