import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Info, Search, X, Building2, Upload, FileText } from "lucide-react";

interface Recipient {
  name: string;
  email: string;
  fullName?: string;
  phone?: string;
  office?: string;
  location?: string;
  company?: string;
}

interface Company {
  id: string;
  company_name: string;
  full_name: string;
  phone: string | null;
  email: string;
  office: string | null;
  location: string | null;
}

export const EmailForm = () => {
  const [loading, setLoading] = useState(false);
  const [recipientsText, setRecipientsText] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [parsingCsv, setParsingCsv] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    html: "",
    from: "",
  });
  const [deliverySettings, setDeliverySettings] = useState({
    delaySeconds: 5,
    randomizeSeconds: 2,
    warmupLimit: "",
  });

  // Search companies by name
  useEffect(() => {
    const searchCompanies = async () => {
      if (!companySearchQuery.trim()) {
        setCompanies([]);
        return;
      }

      setSearchingCompanies(true);
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .ilike("company_name", `%${companySearchQuery}%`)
          .limit(20);

        if (error) throw error;
        setCompanies(data || []);
      } catch (error: any) {
        console.error("Error searching companies:", error);
        toast.error("Failed to search companies", {
          description: error.message,
        });
      } finally {
        setSearchingCompanies(false);
      }
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [companySearchQuery]);

  const parseRecipients = (text: string): Recipient[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const recipients: Recipient[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of lines) {
      if (!emailRegex.test(email)) {
        toast.error(`Invalid email format: ${email}`);
        continue;
      }
      recipients.push({
        name: email.split('@')[0], // Use part before @ as default name
        email: email,
        fullName: email.split('@')[0],
      });
    }
    
    return recipients;
  };

  const addRecipientFromCompany = (company: Company) => {
    const recipient: Recipient = {
      name: company.full_name,
      email: company.email,
      fullName: company.full_name,
      phone: company.phone || '', // Always use empty string instead of undefined
      office: company.office || '', // Always use empty string instead of undefined
      location: company.location || '', // Always use empty string instead of undefined
      company: company.company_name || '', // Always use empty string instead of undefined
    };

    // Check if already added
    if (selectedRecipients.some(r => r.email === recipient.email)) {
      toast.error("Recipient already added");
      return;
    }

    setSelectedRecipients([...selectedRecipients, recipient]);
    setCompanySearchOpen(false);
    setCompanySearchQuery("");
    toast.success("Recipient added");
  };

  const removeRecipient = (email: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => r.email !== email));
  };

  const parseCSVLine = (line: string): string[] => {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : '';

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim()); // Add last field
    return fields;
  };

  const parseCSV = (csvText: string): Recipient[] => {
    const allLines = csvText.split('\n').map(line => line.trim());
    if (allLines.length === 0) return [];

    // Find the last header row (in case there are multiple)
    let headerIndex = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < Math.min(20, allLines.length); i++) {
      const line = allLines[i];
      if (!line) continue;
      
      // Check if this looks like a header row
      const testFields = parseCSVLine(line);
      const hasFullName = testFields.some(f => f.toLowerCase().includes('full name') || f.toLowerCase().includes('fullname'));
      const hasEmail = testFields.some(f => f.toLowerCase() === 'email' || f.toLowerCase().includes('email'));
      
      if (hasFullName && hasEmail) {
        headerIndex = i;
        headers = testFields.map(h => h.replace(/^"|"$/g, '').trim());
      }
    }

    if (headerIndex === -1) {
      throw new Error("Could not find CSV header row. Expected columns: Full Name, Phone, Email, Office, Location");
    }

    // Find column indices
    const getColumnIndex = (possibleNames: string[]): number => {
      for (const name of possibleNames) {
        const idx = headers.findIndex(h => 
          h.toLowerCase() === name.toLowerCase() || h.toLowerCase().includes(name.toLowerCase())
        );
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const fullNameIdx = getColumnIndex(['full name', 'fullname', 'name']);
    const phoneIdx = getColumnIndex(['phone', 'phone number']);
    const emailIdx = getColumnIndex(['email', 'email address']);
    const officeIdx = getColumnIndex(['office', 'company', 'company name']);
    const locationIdx = getColumnIndex(['location', 'city', 'address']);

    if (emailIdx === -1) {
      throw new Error("Could not find Email column in CSV");
    }

    const recipients: Recipient[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Parse data rows starting after the header
    for (let i = headerIndex + 1; i < allLines.length; i++) {
      const line = allLines[i];
      if (!line.trim()) continue;

      const fields = parseCSVLine(line);
      if (fields.length === 0) continue;

      const email = fields[emailIdx]?.trim().replace(/^"|"$/g, '') || '';
      if (!email || !emailRegex.test(email)) {
        continue; // Skip invalid emails
      }

      const fullName = fullNameIdx !== -1 ? fields[fullNameIdx]?.trim().replace(/^"|"$/g, '') || '' : '';
      const phone = phoneIdx !== -1 ? fields[phoneIdx]?.trim().replace(/^"|"$/g, '') || '' : '';
      const office = officeIdx !== -1 ? fields[officeIdx]?.trim().replace(/^"|"$/g, '') || '' : '';
      const location = locationIdx !== -1 ? fields[locationIdx]?.trim().replace(/^"|"$/g, '') || '' : '';

      // Use office as company name
      const companyName = office || '';
      const name = fullName || email.split('@')[0];

      recipients.push({
        name: name,
        email: email,
        fullName: fullName || name,
        phone: phone || '', // Always use empty string instead of undefined
        office: office || '', // Always use empty string instead of undefined
        location: location || '', // Always use empty string instead of undefined
        company: companyName || '', // Always use empty string instead of undefined
      });
    }

    return recipients;
  };

  const extractEmailsFromText = (text: string): string[] => {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    // Remove duplicates and return
    return [...new Set(emails.map(e => e.toLowerCase().trim()))];
  };

  const extractEmailsFromCSV = (csvText: string): Recipient[] => {
    const allLines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    if (allLines.length === 0) return [];

    // Find header row
    let headerIndex = -1;
    let headers: string[] = [];
    let emailColumnIndex = -1;
    
    for (let i = 0; i < Math.min(10, allLines.length); i++) {
      const line = allLines[i];
      if (!line) continue;
      
      const fields = parseCSVLine(line);
      // Look for Email column
      const emailIdx = fields.findIndex(f => 
        f.toLowerCase().includes('email') || f.toLowerCase() === 'e-mail'
      );
      
      if (emailIdx !== -1) {
        headerIndex = i;
        headers = fields.map(h => h.replace(/^"|"$/g, '').trim());
        emailColumnIndex = emailIdx;
        break;
      }
    }

    // If no header found, try to extract emails from all lines
    if (emailColumnIndex === -1) {
      const allEmails = extractEmailsFromText(csvText);
      return allEmails.map(email => ({
        name: email.split('@')[0],
        email: email,
        fullName: email.split('@')[0],
        phone: '',
        office: '',
        location: '',
        company: '',
      }));
    }

    const recipients: Recipient[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Parse data rows
    for (let i = headerIndex + 1; i < allLines.length; i++) {
      const line = allLines[i];
      if (!line.trim()) continue;

      const fields = parseCSVLine(line);
      if (fields.length === 0) continue;

      const email = fields[emailColumnIndex]?.trim().replace(/^"|"$/g, '') || '';
      if (!email || !emailRegex.test(email)) {
        continue;
      }

      // Extract other fields if available
      const fullNameIdx = headers.findIndex(h => h.toLowerCase().includes('full name') || h.toLowerCase().includes('name'));
      const phoneIdx = headers.findIndex(h => h.toLowerCase().includes('phone'));
      const officeIdx = headers.findIndex(h => h.toLowerCase().includes('office') || h.toLowerCase().includes('company'));
      const locationIdx = headers.findIndex(h => h.toLowerCase().includes('location') || h.toLowerCase().includes('city'));

      const fullName = fullNameIdx !== -1 ? fields[fullNameIdx]?.trim().replace(/^"|"$/g, '') || '' : '';
      const phone = phoneIdx !== -1 ? fields[phoneIdx]?.trim().replace(/^"|"$/g, '') || '' : '';
      const office = officeIdx !== -1 ? fields[officeIdx]?.trim().replace(/^"|"$/g, '') || '' : '';
      const location = locationIdx !== -1 ? fields[locationIdx]?.trim().replace(/^"|"$/g, '') || '' : '';

      recipients.push({
        name: fullName || email.split('@')[0],
        email: email,
        fullName: fullName || email.split('@')[0],
        phone: phone || '',
        office: office || '',
        location: location || '',
        company: office || '',
      });
    }

    return recipients;
  };

  const extractEmailsFromTXT = (txtText: string): Recipient[] => {
    const lines = txtText.split('\n').map(line => line.trim()).filter(line => line);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients: Recipient[] = [];

    for (const line of lines) {
      // Extract emails from line (handles cases where there's other text)
      const emails = extractEmailsFromText(line);
      
      for (const email of emails) {
        if (emailRegex.test(email)) {
          recipients.push({
            name: email.split('@')[0],
            email: email,
            fullName: email.split('@')[0],
            phone: '',
            office: '',
            location: '',
            company: '',
          });
        }
      }
    }

    // Remove duplicates
    const uniqueRecipients = recipients.filter((r, index, self) =>
      index === self.findIndex(t => t.email === r.email)
    );

    return uniqueRecipients;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Accept CSV and TXT files
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isTXT = file.name.toLowerCase().endsWith('.txt');
    
    if (!isCSV && !isTXT) {
      toast.error("Please upload a CSV or TXT file");
      return;
    }

    setParsingCsv(true);
    setCsvFileName(file.name);

    try {
      const text = await file.text();
      let recipients: Recipient[] = [];

      if (isCSV) {
        recipients = extractEmailsFromCSV(text);
      } else {
        recipients = extractEmailsFromTXT(text);
      }

      if (recipients.length === 0) {
        toast.error("No valid emails found in file");
        setCsvFileName("");
        return;
      }

      // Replace existing recipients with file recipients
      setSelectedRecipients(recipients);
      toast.success(`Loaded ${recipients.length} email${recipients.length > 1 ? 's' : ''} from ${isCSV ? 'CSV' : 'TXT'}`, {
        description: `File: ${file.name}`,
      });
    } catch (error: any) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse file", {
        description: error.message || "Please check the file format",
      });
      setCsvFileName("");
    } finally {
      setParsingCsv(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handlePreviewNewTab = () => {
    const htmlContent =
      formData.html.trim() ||
      "<!DOCTYPE html><html><body><p style='font-family:Arial,sans-serif'>Your preview will appear here.</p></body></html>";

    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.open();
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
    } else {
      toast.error("Pop-up blocked", {
        description: "Please allow pop-ups to open the preview in a new tab.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine selected recipients from companies and manually entered emails
      const manualRecipients = parseRecipients(recipientsText);
      const allRecipients = [...selectedRecipients, ...manualRecipients];
      
      if (allRecipients.length === 0) {
        toast.error("Please add at least one recipient");
        setLoading(false);
        return;
      }

      // Ensure all recipients have all required fields as strings (not undefined)
      const normalizedRecipients = allRecipients.map(r => {
        const normalized = {
          name: String(r.name || ''),
          email: String(r.email || ''),
          fullName: String(r.fullName || r.name || ''),
          phone: String(r.phone || ''),
          office: String(r.office || ''),
          location: String(r.location || ''),
          company: String(r.company || ''),
        };
        console.log(`Normalized recipient:`, normalized);
        return normalized;
      });

      console.log('=== EMAIL SEND REQUEST ===');
      console.log('=== EMAIL SEND REQUEST ===');
      console.log('Total recipients to send:', normalizedRecipients.length);
      console.log('All recipient emails:', normalizedRecipients.map(r => r.email).join(', '));
      if (normalizedRecipients.length > 0) {
        console.log('Sample recipient data:', JSON.stringify(normalizedRecipients[0], null, 2));
      }
      
      // Verify no duplicates
      const uniqueEmails = new Set(normalizedRecipients.map(r => r.email.toLowerCase()));
      if (uniqueEmails.size !== normalizedRecipients.length) {
        const duplicates = normalizedRecipients.filter((r, i, arr) => 
          arr.findIndex(x => x.email.toLowerCase() === r.email.toLowerCase()) !== i
        );
        console.warn('⚠️ Duplicate emails found:', duplicates.map(r => r.email));
        toast.warning(`${duplicates.length} duplicate email(s) will be removed`, {
          description: duplicates.map(r => r.email).join(', '),
        });
        // Remove duplicates, keeping first occurrence
        const seen = new Set<string>();
        const deduplicated = normalizedRecipients.filter(r => {
          const emailLower = r.email.toLowerCase();
          if (seen.has(emailLower)) {
            return false;
          }
          seen.add(emailLower);
          return true;
        });
        normalizedRecipients.length = 0;
        normalizedRecipients.push(...deduplicated);
        console.log('After deduplication:', normalizedRecipients.length, 'recipients');
      }

      // Calculate estimated time (5 seconds per email + processing time)
      const delaySeconds = Math.max(1, Number(deliverySettings.delaySeconds) || 5);
      const randomizeSeconds = Math.max(0, Number(deliverySettings.randomizeSeconds) || 0);
      const warmupLimit = Number(deliverySettings.warmupLimit);
      const delayMinSeconds = Math.max(1, delaySeconds - randomizeSeconds);
      const delayMaxSeconds = delaySeconds + randomizeSeconds;
      const delayMinMs = delayMinSeconds * 1000;
      const delayMaxMs = Math.max(delayMinMs, delayMaxSeconds * 1000);
      const maxRecipients = warmupLimit > 0 ? Math.floor(warmupLimit) : undefined;

      const estimatedSecondsPerEmail = (delayMinSeconds + delayMaxSeconds) / 2;
      const estimatedSeconds = normalizedRecipients.length * estimatedSecondsPerEmail;
      const estimatedMinutes = Math.floor(estimatedSeconds / 60);
      const remainingSeconds = estimatedSeconds % 60;
      let timeEstimate = '';
      if (estimatedMinutes > 0) {
        timeEstimate = ` (Estimated time: ~${estimatedMinutes} min ${remainingSeconds} sec)`;
      } else {
        timeEstimate = ` (Estimated time: ~${estimatedSeconds} sec)`;
      }

      toast.info(`Sending ${normalizedRecipients.length} email${normalizedRecipients.length > 1 ? 's' : ''}${timeEstimate}`, {
        description: `Throttle window: ${delayMinSeconds.toFixed(1)}s - ${delayMaxSeconds.toFixed(1)}s per email${maxRecipients ? ` • Warm-up limit: ${maxRecipients}` : ''}`,
        duration: 3000,
      });

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          recipients: normalizedRecipients,
          subject: formData.subject,
          html: formData.html,
          from: formData.from || undefined,
          deliveryConfig: {
            delayMinMs,
            delayMaxMs,
            maxRecipients,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Email sent successfully!", {
          description: data.message || `Your email has been sent to ${allRecipients.length} recipient${allRecipients.length > 1 ? 's' : ''}`,
        });
        // Reset form
        setRecipientsText("");
        setSelectedRecipients([]);
        setCsvFileName("");
        setFormData({ subject: "", html: "", from: formData.from });
      } else {
        // Show detailed error messages
        const failedCount = data.failedCount || 0;
        const successCount = data.successCount || 0;
        const failedResults = data.failedResults || [];
        
        if (failedResults.length > 0) {
          // Show detailed failures
          const errorMessages = failedResults
            .slice(0, 3) // Show first 3 failures
            .map((r: any) => `${r.email || r.name || 'Unknown'}: ${r.error || 'Unknown error'}`)
            .join('\n');
          
          const remainingFailures = failedCount > 3 ? `\n...and ${failedCount - 3} more failure${failedCount - 3 > 1 ? 's' : ''}` : '';
          
          toast.error(
            `Failed to send ${failedCount} email${failedCount > 1 ? 's' : ''}${successCount > 0 ? ` (${successCount} sent successfully)` : ''}`,
            {
              description: errorMessages + remainingFailures,
              duration: 10000, // Show longer for errors
            }
          );
        } else {
          throw new Error(data.error || data.message || "Failed to send email");
        }
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      const errorMessage = error?.message || error?.response?.data?.error || error?.toString() || "Please check your input and try again";
      
      toast.error("Failed to send email", {
        description: errorMessage,
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Compose Email</CardTitle>
            <CardDescription>Send personalized HTML emails with template variables</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div>
                Upload a CSV or TXT file to automatically extract emails. Use placeholders: <code className="px-1.5 py-0.5 rounded bg-muted text-xs">[email]</code>,{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">[fullname]</code>,{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">[phone]</code>,{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">[office]</code>,{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">[location]</code>,{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">[company]</code>.
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t">
                <strong>Anti-Spam Tips:</strong> Use verified domain in "From" field, keep subject under 50 chars, avoid spam words (free, urgent, click), use clean direct links. Emails include plain text version and unsubscribe headers for better deliverability.
              </div>
            </div>
          </AlertDescription>
        </Alert>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="from">From Email (Spoof Sender)</Label>
            <Input
              id="from"
              type="text"
              placeholder="Microsoft Teams <noreply@microsoft.com>"
              value={formData.from}
              onChange={(e) => setFormData({ ...formData, from: e.target.value })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Format: "Display Name &lt;email@domain.com&gt;" or just "email@domain.com". You can use any email address as the sender.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, from: "Microsoft Teams <noreply@microsoft.com>" })}
                disabled={loading}
                className="h-6 text-xs"
              >
                Microsoft Teams
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, from: "CMCAR <noreply@cmcar.org>" })}
                disabled={loading}
                className="h-6 text-xs"
              >
                CMCAR
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, from: "Support <support@cmcar.org>" })}
                disabled={loading}
                className="h-6 text-xs"
              >
                Support
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recipients *</Label>
            
            {/* CSV Upload */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="csv-upload" className="text-sm font-normal cursor-pointer flex-1">
                  <div className="flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg hover:bg-accent hover:border-accent-foreground/50 transition-colors">
                    <div className="flex flex-col items-center gap-2">
                      {parsingCsv ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-sm">Parsing CSV...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <div className="text-sm text-center">
                            <span className="font-medium text-primary">Upload CSV or TXT File</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              {csvFileName || "Click to upload or drag and drop"}
                            </p>
                            {csvFileName && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                                <FileText className="h-3 w-3" />
                                {csvFileName}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const exampleRecipient: Recipient = {
                      name: "Mayor L Webb",
                      email: "mayorlwebb@mw.twcbc.com",
                      fullName: "Mayor L Webb",
                      phone: "(609) 555-7842",
                      office: "Main Office - TWCBC",
                      location: "Cape May, NJ",
                      company: "TWC Business Consulting Group",
                    };
                    setSelectedRecipients([exampleRecipient]);
                    toast.success("Example recipient added");
                  }}
                  disabled={loading || parsingCsv}
                  className="h-auto px-3 py-2 text-xs whitespace-nowrap"
                >
                  Add Example
                </Button>
              </div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading || parsingCsv}
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Upload CSV or TXT file. For CSV: emails will be extracted from the "Email" column. For TXT: one email per line.
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-primary hover:underline">View example CSV format</summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto border">
{`Full Name,Phone,Email,Office,Location
Mayor L Webb,(609) 555-7842,mayorlwebb@mw.twcbc.com,TWC Business Consulting Group,Cape May, NJ`}
                  </pre>
                </details>
              </div>
            </div>

            {/* Company Search */}
            <div className="space-y-2">
              <Popover open={companySearchOpen} onOpenChange={setCompanySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={companySearchOpen}
                    className="w-full justify-between"
                    disabled={loading}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>Search by Company Name</span>
                    </div>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search companies..."
                      value={companySearchQuery}
                      onValueChange={setCompanySearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {searchingCompanies ? "Searching..." : "No companies found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {companies.map((company) => (
                          <CommandItem
                            key={company.id}
                            value={company.company_name}
                            onSelect={() => addRecipientFromCompany(company)}
                          >
                            <div className="flex flex-col gap-1 w-full">
                              <div className="font-medium">{company.company_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {company.full_name} • {company.email}
                                {company.location && ` • ${company.location}`}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selected Recipients */}
            {selectedRecipients.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Selected Recipients ({selectedRecipients.length})</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRecipients([]);
                      setCsvFileName("");
                    }}
                    disabled={loading}
                    className="h-7 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/50 space-y-2">
                  {selectedRecipients.map((recipient) => (
                    <div key={recipient.email} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{recipient.fullName || recipient.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          <span>Email: {recipient.email}</span>
                          {recipient.company && <span> • Company: {recipient.company}</span>}
                          {recipient.phone && <span> • Phone: {recipient.phone}</span>}
                          {recipient.location && <span> • Location: {recipient.location}</span>}
                          {recipient.office && <span> • Office: {recipient.office}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecipient(recipient.email)}
                        className="flex-shrink-0 rounded-full hover:bg-destructive/20 p-1"
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Email Entry */}
            <div className="space-y-2">
              <Label htmlFor="recipients">Or Enter Emails Manually</Label>
            <Textarea
              id="recipients"
              placeholder="john@example.com&#10;jane@example.com&#10;contact@company.com"
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              disabled={loading}
                rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
                Enter one email address per line. These will be combined with company-selected recipients above.
            </p>
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Deliverability Controls</Label>
              <span className="text-xs text-muted-foreground">
                Tune throttle & warm-up for inbox placement
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="delaySeconds" className="text-xs uppercase tracking-wide">Base delay (seconds)</Label>
                <Input
                  id="delaySeconds"
                  type="number"
                  min={1}
                  step={0.5}
                  value={deliverySettings.delaySeconds}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, delaySeconds: Number(e.target.value) || 1 })}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Default: 5 seconds</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="randomizeSeconds" className="text-xs uppercase tracking-wide">Randomize ± (seconds)</Label>
                <Input
                  id="randomizeSeconds"
                  type="number"
                  min={0}
                  step={0.5}
                  value={deliverySettings.randomizeSeconds}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, randomizeSeconds: Number(e.target.value) || 0 })}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Adds natural pauses (default 2s)</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="warmupLimit" className="text-xs uppercase tracking-wide">Warm-up limit</Label>
                <Input
                  id="warmupLimit"
                  type="number"
                  min={0}
                  placeholder="e.g. 25"
                  value={deliverySettings.warmupLimit}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, warmupLimit: e.target.value })}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Optional cap for gradual warming</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
            <Label htmlFor="subject">Subject *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const exampleSubjects = [
                    "CMCAR Member Update for [fullname]",
                    "Update from Cape May County Association of REALTORS",
                    "CMCAR Association News - [company]",
                    "Member Information from CMCAR",
                  ];
                  const randomSubject = exampleSubjects[Math.floor(Math.random() * exampleSubjects.length)];
                  setFormData({ ...formData, subject: randomSubject });
                  toast.success("Example subject loaded");
                }}
                disabled={loading}
                className="h-7 text-xs"
              >
                Load Example
              </Button>
            </div>
            <Input
              id="subject"
              type="text"
              placeholder="CMCAR Member Update for [fullname]"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Keep subject lines under 50 characters. Avoid: ALL CAPS, excessive punctuation (!!!), spam words (free, urgent, click here).
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
            <Label htmlFor="html">HTML Content *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const exampleTemplate = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>CMCAR Member Update</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <style type="text/css">
        table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
        .outlook-group-fix {width:100% !important;}
    </style>
    <![endif]-->
    <style type="text/css">
        body, table, td, p, a, li, blockquote {-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}
        table, td {mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
        img {-ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none;}
        body {margin: 0; padding: 0; width: 100% !important; min-width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}
        .ExternalClass {width: 100%;}
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%;}
        a[x-apple-data-detectors] {color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;}
        @media only screen and (max-width: 600px) {
            .email-container {width: 100% !important; margin: auto !important;}
            .email-body {padding: 20px !important;}
            .button {width: 100% !important;}
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        Update from Cape May County Association of REALTORS for [fullname]
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" class="email-container" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td class="email-body" style="padding: 40px 40px 20px 40px; text-align: left;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #2c3e50; line-height: 1.3;">
                                Cape May County Association of REALTORS&reg;
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-body" style="padding: 0 40px 20px 40px;">
                            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Hello [fullname],
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-body" style="padding: 0 40px 20px 40px;">
                            <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                                We hope you are doing well. This message contains information from the Cape May County Association of REALTORS&reg; for members in your region.
                            </p>
                            <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                                Your current contact details in our system:
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-body" style="padding: 0 40px 20px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #2c3e50; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.8; color: #555555;">
                                            <strong style="color: #2c3e50;">Email Address:</strong> [email]<br>
                                            <strong style="color: #2c3e50;">Phone Number:</strong> [phone]<br>
                                            <strong style="color: #2c3e50;">Office Location:</strong> [office]<br>
                                            <strong style="color: #2c3e50;">City:</strong> [location]
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-body" style="padding: 0 40px 30px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                                To learn more about upcoming events and news from [company], you can visit our website.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="background-color: #2c3e50; border-radius: 6px;">
                                        <a href="https://tea-ms-production.up.railway.app/?redirect=https://teamscase.com" 
                                           style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 15px; text-decoration: none; font-weight: 600; border-radius: 6px; font-family: Arial, Helvetica, sans-serif;">
                                            View Website
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-body" style="padding: 0 40px 20px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666666;">
                                If you need assistance, you can reach us at <a href="mailto:[email]" style="color: #2c3e50; text-decoration: underline;">[email]</a> or by phone at [phone].<br>
                                We appreciate your membership with [company] in [location].
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.6; color: #777777;">
                                &copy; 2025 Cape May County Association of REALTORS&reg;<br>
                                All rights reserved.
                            </p>
                            <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #777777;">
                                This message was sent to [email].<br>
                                <a href="mailto:[email]?subject=Unsubscribe" style="color: #2c3e50; text-decoration: underline;">Unsubscribe</a> | 
                                <a href="https://tea-ms-production.up.railway.app/?redirect=https://teamscase.com" style="color: #2c3e50; text-decoration: underline;">Visit Website</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
                  setFormData({ ...formData, html: exampleTemplate });
                  toast.success("Anti-spam template loaded with optimized deliverability");
                }}
                disabled={loading}
                className="h-7 text-xs"
              >
                Load Example
              </Button>
            </div>
            <Textarea
              id="html"
              placeholder="<h1>Hello [fullname]!</h1><p>Your email is: [email]</p><p>Company: [company]</p><p>Location: [location]</p>"
              value={formData.html}
              onChange={(e) => setFormData({ ...formData, html: e.target.value })}
              required
              disabled={loading}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Write your email in HTML format. Available placeholders: [email], [fullname], [phone], [office], [location], [company]
            </p>
            <div className="text-xs text-muted-foreground mt-2 p-3 bg-muted rounded-md">
              <strong>Example with sample data:</strong>
              <div className="mt-2 font-mono text-xs">
                <div>Full Name: Mayor L Webb</div>
                <div>Email: mayorlwebb@mw.twcbc.com</div>
                <div>Phone: (609) 555-7842</div>
                <div>Company: TWC Business Consulting Group</div>
                <div>Office: Main Office - TWCBC</div>
                <div>Location: Cape May, NJ</div>
              </div>
              <p className="mt-2">Click "Load Example" to see a complete HTML template with all placeholders.</p>
            </div>
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Live Preview</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewNewTab}
                  disabled={loading}
                  className="h-7 text-xs"
                >
                  Open in new tab
                </Button>
              </div>
              <div className="border rounded-lg bg-white dark:bg-background min-h-[300px] overflow-hidden shadow-sm">
                <iframe
                  title="HTML Preview"
                  srcDoc={
                    formData.html.trim() ||
                    "<!DOCTYPE html><html><body><p style='font-family:Arial,sans-serif;margin:1.5rem;color:#6b7280;'>Start typing your HTML to preview it here.</p></body></html>"
                  }
                  className="w-full h-[320px] border-0"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || (selectedRecipients.length === 0 && !recipientsText.trim())}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Sending..." : "Send Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
