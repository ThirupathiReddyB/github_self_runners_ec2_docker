//Changing support email here as per requirement: Feb 11,2026
export const successAdminAuditorRegistration = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <title>OTP Verification Request</title>
  </head>
  <body>
    <p>Dear {{userName}},</p>
    <p>Your {{role}} profile is active now.</p>
    <p>Please use the following link to sign in <a href="{{dashboardURL}}">{{dashboardURL}}.</a></p>
    <p>Regards,<br/>
      Team Thito <br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:customer-support@thito.in">customer-support@thito.in</a></p>
    </body>
  </body>
</html>
`;

export const complaintReply = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <title>Grievence Report</title>
  </head>
  <body>
   <p>Dear {{name}},</p>
   <p>{{admin_reply}}</p>
   <p>Regards,<br/>
    Team Thito <br/>
    This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:customer-support@thito.in">customer-support@thito.in</a></p>
  </body>
</html>
`;

export const AutocomplaintReply = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <title>Grievence Report</title>
  </head>
  <body>
   <p>Dear {{name}},</p>
   <p>Thanks for contacting THITO. Your complaint No. is {{complaintId}}. We will respond shortly to resolve the
   issue. Please use the complaint number for future correspondence on this complaint. </p>  
   <p>Regards,<br/>
    Team Thito <br/>
    This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:customer-support@thito.in">customer-support@thito.in</a></p>
  </body>
</html>
`;
export const otp_verification_dashboardUsers = `
<!DOCTYPE >
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  
  <title>OTP verification </title>
 </head>
  <body>
    <p>Dear {{firstName}},</p>

    <p>To create new profile on THITO, OTP is {{data}}, it is valid for 15 minutes. Do not share the OTP.</p>

      <p>Regards,<br/>
      Team Thito <br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:customer-support@thito.in">customer-support@thito.inn</a></p>
    
  </body>
</html>
`;

export const otp_verification_dashboardUsers_login = `
<!DOCTYPE >
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  
  <title>OTP verification </title>
 </head>
  <body>
    <p>Dear {{firstName}},</p>

    <p>To Log into the THITO dashboard, please enter OTP {{data}}. Do not share the OTP.</p>

    <p>Regards,<br/>
      Team Thito<br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:customer-support@thito.in">customer-support@thito.in</a></p>
  </body>
    
  </body>
</html>
`;

export const partner_voucher = `
<!DOCTYPE >
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  
  <title>THITO Partner Voucher</title>
 </head>
  <body>
    <p>Dear Partner,</p>

    <p>We’re thrilled to have you onboard and excited about our long-term partnership! As a first step, we’d love to extend a special discount offer to your consumers:</p>
    <p>Please find the voucher details below, along with the attached digital voucher for easy sharing:</p><br/>

    <p>Voucher Details:</p><br/>
    <p>Voucher Code:<b> {{voucherCode}}</b> </p>
    <p>Percentage Off: <b>{{voucherAmount}}%</b></p>
    <p>Voucher Description: <b>{{description}}</b></p>
    <p>Expiry Date of Voucher: <b>{{expiry}}</b></p>
    <p>Redemption limit: <b>{{redeemLimit}}</b></p>

    <p>Should you have any questions or require any assistance, please feel free to reach out to utekar.parag@steigenhealthcare.com.</p><br/>
    <p>Looking forward to a successful collaboration!</p><br/><br/>


    <p>Regards,<br/>
      Team Thito<br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:customer-support@thito.in">customer-support@thito.in</a></p>
  </body>
  </body>
</html>
`;

export const emailInvoice = `
<!DOCTYPE >
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  
  <title>THITO: Invoice Number: {{txnId}}</title>
 </head>
  <body>
    <p>Dear {{userName}},</p>

    <p>We hope THITO is helping you take better care of yourself and your loved ones.</p>
    <p>Please find attached Invoice # {{txnId}} for your recent engagement with THITO.</b></p>
    <p>If you have any questions or need further assistance, feel free to reach out to us at <strong>customer-support@thito.in</strong></b> </p>
    <p>Thank you for being a valued member of the THITO community.</b></p>
    <p>Warm regards,<br/>
      <strong>Team THITO</strong><br/><br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:customer-support@thito.in">customer-support@thito.in</a></p>
  </body>
    
  </body>
</html>`;

export const userListCSV = `
<!DOCTYPE >
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  
  <title>THITO: Application Users Data</title>
 </head>
  <body>
    <p>Dear SuperAdmin,</p>

    <p>Please find attached the excel sheet containing all user data as requested.</p><br/>


    <p>Regards,<br/>
      Team Thito<br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:customer-support@thito.in">customer-support@thito.in</a></p>
  </body>
    
  </body>
</html>`;
