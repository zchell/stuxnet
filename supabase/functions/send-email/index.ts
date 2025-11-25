import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  name: string;
  email: string;
  fullName?: string;
  phone?: string;
  office?: string;
  location?: string;
  company?: string;
}

interface DeliveryConfig {
  delayMinMs?: number;
  delayMaxMs?: number;
  maxRecipients?: number;
}

interface EmailRequest {
  recipients: Recipient[];
  subject: string;
  html: string;
  from?: string;
  deliveryConfig?: DeliveryConfig;
}

// Initialize Supabase client for saving history
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, subject, html, from, deliveryConfig }: EmailRequest = await req.json();

    console.log("Sending emails to:", recipients.length, "recipients");

    // Validate required fields
    if (!recipients || !subject || !html) {
      throw new Error("Missing required fields: recipients, subject, and html are required");
    }

    // Validate recipients
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("At least one recipient is required");
    }

    // Use the provided from address or default to Resend's onboarding email
    const fromAddress = from?.trim() || "Lovable <onboarding@resend.dev>";

    // Send personalized email to each recipient with 5 second throttle for better deliverability
    const results = [];
    const delayMinMs = Math.max(1000, deliveryConfig?.delayMinMs ?? 5000);
    const delayMaxMs = Math.max(delayMinMs, deliveryConfig?.delayMaxMs ?? delayMinMs);
    const maxRecipients = deliveryConfig?.maxRecipients && deliveryConfig.maxRecipients > 0
      ? Math.floor(deliveryConfig.maxRecipients)
      : undefined;
    
    const randomDelay = () => {
      if (delayMinMs === delayMaxMs) return delayMinMs;
      return Math.floor(Math.random() * (delayMaxMs - delayMinMs + 1)) + delayMinMs;
    };
    
    console.log(`=== STARTING EMAIL SEND ===`);
    console.log(`Total recipients to process: ${recipients.length}`);
    console.log(`Throttle window: ${delayMinMs / 1000}s - ${delayMaxMs / 1000}s per email`);
    if (maxRecipients) {
      console.log(`Warm-up limit enabled: will send to first ${maxRecipients} recipients`);
    }
    
    // Validate all recipients before starting
    let validRecipients = recipients.filter((r, index) => {
      if (!r || !r.email) {
        console.warn(`⚠️ Skipping invalid recipient at index ${index}:`, r);
        results.push({
          email: r?.email || 'unknown',
          name: r?.name || 'unknown',
          success: false,
          error: 'Invalid recipient data - missing email',
        });
        return false;
      }
      if (!r.name) {
        // Auto-generate name from email if missing
        r.name = r.email.split('@')[0];
      }
      return true;
    });
    
    if (maxRecipients && validRecipients.length > maxRecipients) {
      console.log(`Applying warm-up limit: slicing to first ${maxRecipients} recipients`);
      validRecipients = validRecipients.slice(0, maxRecipients);
    }
    
    console.log(`Valid recipients: ${validRecipients.length} out of ${recipients.length}`);
    
    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];
      const emailNumber = i + 1;
      const totalEmails = validRecipients.length;
      
      console.log(`\n[${emailNumber}/${totalEmails}] Processing: ${recipient.email}`);
      
      // Add delay before sending (except for the first email)
      if (i > 0) {
        const delay = randomDelay();
        console.log(`[${emailNumber}/${totalEmails}] Throttling: waiting ${(delay / 1000).toFixed(2)}s before next email...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      try {
        // Validate recipient data (double check)
        if (!recipient.name || !recipient.email) {
          throw new Error(`Missing recipient data: ${JSON.stringify(recipient)}`);
        }

        // Replace all placeholders in HTML
        // Get values with fallbacks - ensure we always have a string value
        const fullName = (recipient.fullName || recipient.name || '').toString().trim();
        const phone = (recipient.phone || '').toString().trim();
        const office = (recipient.office || '').toString().trim();
        const location = (recipient.location || '').toString().trim();
        const company = (recipient.company || '').toString().trim();
        const email = (recipient.email || '').toString().trim();
        const name = (recipient.name || email.split('@')[0] || '').toString().trim();

        // Log recipient data for debugging
        console.log(`Raw recipient data:`, JSON.stringify(recipient, null, 2));
        console.log(`Processed values:`, {
          name,
          email,
          fullName,
          phone,
          office,
          location,
          company
        });

        // Replace all placeholders - use a more robust approach
        let personalizedHtml = html;
        
        // Function to replace placeholders, handling various formats
        const replacePlaceholder = (html: string, placeholder: string, value: string): string => {
          // Replace exact match [placeholder]
          html = html.replace(new RegExp(`\\[${placeholder}\\]`, 'gi'), value);
          // Replace with possible whitespace [ placeholder ]
          html = html.replace(new RegExp(`\\[\\s*${placeholder}\\s*\\]`, 'gi'), value);
          return html;
        };
        
        // Apply all replacements in order
        personalizedHtml = replacePlaceholder(personalizedHtml, 'email', email);
        personalizedHtml = replacePlaceholder(personalizedHtml, 'fullname', fullName);
        personalizedHtml = replacePlaceholder(personalizedHtml, 'full_name', fullName);
        personalizedHtml = replacePlaceholder(personalizedHtml, 'name', name);
        personalizedHtml = replacePlaceholder(personalizedHtml, 'phone', phone);
        personalizedHtml = replacePlaceholder(personalizedHtml, 'office', office);
        personalizedHtml = replacePlaceholder(personalizedHtml, 'location', location);
        personalizedHtml = replacePlaceholder(personalizedHtml, 'company', company);
        personalizedHtml = replacePlaceholder(personalizedHtml, 'company_name', company);
        
        // Log what was replaced
        console.log(`Replacement results:`);
        console.log(`  [email] -> ${email} (${email ? 'OK' : 'EMPTY'})`);
        console.log(`  [fullname] -> ${fullName} (${fullName ? 'OK' : 'EMPTY'})`);
        console.log(`  [phone] -> ${phone} (${phone ? 'OK' : 'EMPTY'})`);
        console.log(`  [office] -> ${office} (${office ? 'OK' : 'EMPTY'})`);
        console.log(`  [location] -> ${location} (${location ? 'OK' : 'EMPTY'})`);
        console.log(`  [company] -> ${company} (${company ? 'OK' : 'EMPTY'})`);

        // Log sample of result
        console.log(`Sending personalized email to ${recipient.name} <${recipient.email}>`);
        console.log(`HTML sample (first 500 chars):`, personalizedHtml.substring(0, 500));
        
        // Check if any placeholders remain
        const remainingPlaceholders = personalizedHtml.match(/\[(?:email|fullname|full_name|name|phone|office|location|company|company_name)\]/gi);
        if (remainingPlaceholders) {
          console.warn(`⚠️ WARNING: Some placeholders were not replaced:`, remainingPlaceholders);
        }

        // Create plain text version for better deliverability
        const plainText = personalizedHtml
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();

        // Personalize subject line
        const personalizedSubject = subject
          .replace(/\[fullname\]/gi, fullName)
          .replace(/\[name\]/gi, name)
          .replace(/\[email\]/gi, email)
          .replace(/\[company\]/gi, company);

        // Extract reply-to from fromAddress
        let replyTo: string | undefined = undefined;
        if (fromAddress.includes('<') && fromAddress.includes('>')) {
          const replyToMatch = fromAddress.match(/<(.+)>/);
          replyTo = replyToMatch ? replyToMatch[1] : undefined;
        } else if (fromAddress.includes('@')) {
          replyTo = fromAddress;
        }

        // Build headers for better deliverability
        const emailHeaders: Record<string, string> = {
          'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        
        // Add unsubscribe headers if reply-to is available
        if (replyTo) {
          emailHeaders['List-Unsubscribe'] = `<mailto:${replyTo}?subject=unsubscribe>, <https://tea-ms-production.up.railway.app/unsubscribe>`;
          emailHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
        } else {
          emailHeaders['List-Unsubscribe'] = '<https://tea-ms-production.up.railway.app/unsubscribe>';
        }

        const emailResponse = await resend.emails.send({
          from: fromAddress,
          to: [recipient.email],
          replyTo: replyTo,
          subject: personalizedSubject,
          html: personalizedHtml,
          text: plainText,
          headers: emailHeaders,
        });

        if (emailResponse.error) {
          console.error(`Failed to send email to ${recipient.email}:`, emailResponse.error);
          const errorMessage = emailResponse.error.message || JSON.stringify(emailResponse.error);
          
          // Save to history
          await supabase
            .from('email_history')
            .insert({
              subject,
              html_content: html,
              from_address: fromAddress,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              status: 'failed',
              error_message: errorMessage,
            });

          results.push({
            email: recipient.email,
            name: recipient.name,
            success: false,
            error: errorMessage,
          });
        } else {
          console.log(`Email sent successfully to ${recipient.email}:`, emailResponse);

          // Save to history
          const { error: historyError } = await supabase
            .from('email_history')
            .insert({
              subject,
              html_content: html,
              from_address: fromAddress,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              status: 'success',
              error_message: null,
            });

          if (historyError) {
            console.error("Error saving to history:", historyError);
          }

          results.push({
            email: recipient.email,
            name: recipient.name,
            success: true,
            error: null,
          });
        }
      } catch (error: any) {
        console.error(`❌ ERROR sending to ${recipient.email}:`, error);
        
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        console.error(`Error details:`, error);
        
        // Save failed attempt to history
        try {
          await supabase
            .from('email_history')
            .insert({
              subject,
              html_content: html,
              from_address: fromAddress,
              recipient_email: recipient.email,
              recipient_name: recipient.name || '',
              status: 'failed',
              error_message: errorMessage,
            });
        } catch (historyError) {
          console.error(`Failed to save history for ${recipient.email}:`, historyError);
        }

        results.push({
          email: recipient.email,
          name: recipient.name || '',
          success: false,
          error: errorMessage,
        });
        
        // Continue to next recipient even if this one failed
        console.log(`Continuing to next recipient...`);
      }
    }
    
    // Final verification - ensure we processed ALL recipients
    console.log(`\n=== EMAIL SEND COMPLETE ===`);
    console.log(`Total recipients received: ${recipients.length}`);
    console.log(`Valid recipients: ${validRecipients.length}`);
    console.log(`Results processed: ${results.length}`);
    
    // Verify all valid recipients were processed
    const processedEmails = new Set(results.map(r => r.email.toLowerCase()));
    const missingRecipients = validRecipients.filter(r => !processedEmails.has(r.email.toLowerCase()));
    
    if (missingRecipients.length > 0) {
      console.error(`❌ CRITICAL: ${missingRecipients.length} recipient(s) were NOT processed!`);
      console.error(`Missing recipients:`, missingRecipients.map(r => `${r.name} <${r.email}>`));
      
      // Add missing recipients as failed with error
      for (const missing of missingRecipients) {
        results.push({
          email: missing.email,
          name: missing.name || '',
          success: false,
          error: 'Recipient was not processed - system error. Please retry.',
        });
      }
    }
    
    // Final count verification
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`📊 Total processed: ${results.length} out of ${recipients.length} received`);
    
    if (results.length < recipients.length) {
      console.warn(`⚠️ Some recipients were skipped due to invalid data`);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;
    const failedResults = results.filter(r => !r.success);
    const successfulResults = results.filter(r => r.success);

    // Build detailed message
    let message = `Sent ${successCount} email(s) successfully`;
    if (failedCount > 0) {
      message += `, ${failedCount} failed`;
      if (failedResults.length > 0 && failedResults[0].error) {
        message += `: ${failedResults[0].email} - ${failedResults[0].error}`;
        if (failedCount > 1) {
          message += ` (and ${failedCount - 1} more)`;
        }
      }
    }

    return new Response(JSON.stringify({
      success: failedCount === 0,
      message: message,
      results: results,
      successCount,
      failedCount,
      failedResults: failedResults,
      successfulResults: successfulResults,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);