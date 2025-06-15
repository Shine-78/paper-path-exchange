
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";

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

    const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '');

    const { purchaseRequestId, expectedDeliveryDate } = await req.json();

    // Get purchase request details with buyer and seller info
    const { data: purchaseRequest, error: requestError } = await supabaseService
      .from('purchase_requests')
      .select(`
        *,
        books!inner(title, author),
        buyer:buyer_id(email, full_name),
        seller:seller_id(email, full_name)
      `)
      .eq('id', purchaseRequestId)
      .single();

    if (requestError || !purchaseRequest) {
      throw new Error('Purchase request not found');
    }

    const buyerEmail = purchaseRequest.buyer.email;
    const buyerName = purchaseRequest.buyer.full_name || 'Dear Customer';
    const sellerName = purchaseRequest.seller.full_name || 'Seller';
    const bookTitle = purchaseRequest.books.title;
    const bookAuthor = purchaseRequest.books.author;

    // Format delivery date
    const deliveryDate = new Date(expectedDeliveryDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email notification to buyer
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📚 Your Book Request Has Been Accepted!</h2>
        
        <p>Hi ${buyerName},</p>
        
        <p>Great news! ${sellerName} has accepted your purchase request for:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">${bookTitle}</h3>
          <p style="margin: 0; color: #6b7280;">by ${bookAuthor}</p>
          <p style="margin: 10px 0 0 0; color: #6b7280;">Price: ₹${purchaseRequest.offered_price}</p>
        </div>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
          <h4 style="margin: 0 0 10px 0; color: #065f46;">📅 Expected Delivery Date</h4>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #047857;">${deliveryDate}</p>
        </div>
        
        <p>The seller will arrange for delivery by this date. You'll receive further updates about the delivery process.</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #92400e;">📱 Next Steps:</h4>
          <ul style="margin: 0; color: #92400e;">
            <li>Keep an eye on your notifications for delivery updates</li>
            <li>You can chat with the seller through the app</li>
            <li>Payment will be processed upon delivery confirmation</li>
          </ul>
        </div>
        
        <p>Thank you for using BookEx!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated email from BookEx. Please do not reply to this email.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: 'BookEx <notifications@bookex.app>',
      to: [buyerEmail],
      subject: `📚 Book Request Accepted - Delivery Expected on ${deliveryDate}`,
      html: emailContent,
    });

    // Create web notification for buyer
    await supabaseService
      .from('notifications')
      .insert({
        user_id: purchaseRequest.buyer_id,
        type: 'delivery_scheduled',
        title: '📅 Delivery Date Set!',
        message: `Your book "${bookTitle}" will be delivered by ${deliveryDate}. ${sellerName} has accepted your request.`,
        related_id: purchaseRequestId,
        priority: 'high'
      });

    // Create notification for seller as confirmation
    await supabaseService
      .from('notifications')
      .insert({
        user_id: purchaseRequest.seller_id,
        type: 'request_accepted',
        title: '✅ Request Accepted',
        message: `You've accepted the request for "${bookTitle}" with delivery expected by ${deliveryDate}.`,
        related_id: purchaseRequestId,
        priority: 'normal'
      });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Delivery notification sent successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error sending delivery notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
