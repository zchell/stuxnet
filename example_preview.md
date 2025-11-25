# Email Example Preview

## Example Recipient Data

When you click "Add Example", this recipient will be added:

- **Full Name:** Mayor L Webb
- **Email:** mayorlwebb@mw.twcbc.com
- **Phone:** (609) 555-7842
- **Company:** TWC Business Consulting Group
- **Office:** Main Office - TWCBC
- **Location:** Cape May, NJ

## Example HTML Template

When you click "Load Example", this HTML template will be loaded:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2c3e50; margin-bottom: 20px;">Hello [fullname]!</h1>
    
    <p style="margin-bottom: 15px;">Thank you for your interest. This is a personalized email template.</p>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="color: #34495e; margin-top: 0;">Your Contact Information:</h2>
      <ul style="list-style: none; padding: 0;">
        <li style="margin-bottom: 10px;"><strong>Email:</strong> [email]</li>
        <li style="margin-bottom: 10px;"><strong>Phone:</strong> [phone]</li>
        <li style="margin-bottom: 10px;"><strong>Company:</strong> [company]</li>
        <li style="margin-bottom: 10px;"><strong>Office:</strong> [office]</li>
        <li style="margin-bottom: 10px;"><strong>Location:</strong> [location]</li>
      </ul>
    </div>
    
    <p style="margin-top: 20px;">We look forward to connecting with you at [company].</p>
    
    <p style="margin-top: 20px; color: #7f8c8d; font-size: 14px;">
      Best regards,<br>
      The Team
    </p>
  </div>
</body>
</html>
```

## How Placeholders Work

When the email is sent, the placeholders will be automatically replaced:

- `[fullname]` → **Mayor L Webb**
- `[email]` → **mayorlwebb@mw.twcbc.com**
- `[phone]` → **(609) 555-7842**
- `[company]` → **TWC Business Consulting Group**
- `[office]` → **Main Office - TWCBC**
- `[location]` → **Cape May, NJ**

## Final Email Preview

The recipient will receive an email that looks like:

---

**Subject:** (Whatever you enter in the subject field)

**Body:**

Hello **Mayor L Webb**!

Thank you for your interest. This is a personalized email template.

**Your Contact Information:**
- **Email:** mayorlwebb@mw.twcbc.com
- **Phone:** (609) 555-7842
- **Company:** TWC Business Consulting Group
- **Office:** Main Office - TWCBC
- **Location:** Cape May, NJ

We look forward to connecting with you at TWC Business Consulting Group.

Best regards,
The Team

---

## CSV Format Example

If you're using a CSV file, the row for this example would be:

```
Full Name,Phone,Email,Office,Location
Mayor L Webb,(609) 555-7842,mayorlwebb@mw.twcbc.com,TWC Business Consulting Group,Cape May, NJ
```

