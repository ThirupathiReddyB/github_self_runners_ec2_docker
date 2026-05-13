//1.create otp
export const createUserOtpVerification = `
<!DOCTYPE html>
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
 </head>
  <body>
    <p>To create new profile on THITO, OTP is {{otp}}, it is valid for 2 hours. Please click <a href="{{TNC_url}}">{{TNC_url}}</a> to read and accept the terms. Do not share the OTP.</b></p>
    <p>Regards,<br/>
    Steigen Healthcare <br/>
    This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:info@thito.in">info@thito.in</a></p>
  </body>
</html>
`;

//2. successfull registration
export const userId_information = `
<!DOCTYPE >
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
 </head>
  <body>
    <p>Dear User {{uid}},</p>

    <p>Welcome to THITO. Your User ID is {{uid}}. You can use it for login. Stay updated with your health
      data.</p>

    <p>Regards,<br/>
      Steigen Healthcare<br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:info@thito.in">info@thito.in</a></p>
  </body>
</html>
`;

//3.login otp and resend login
export const loginOTP = `
<!DOCTYPE >
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
 </head>
  <body>
    <p>Dear User {{uid}},</p>

    <p>To Log into the THITO App, please enter OTP {{otp}}. Do not share the OTP.</p>

    <p>Regards,<br/>
      Steigen Healthcare<br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:info@thito.in">info@thito.in</a></p>
  </body>
</html>
`;

//4.OTP to reset password
export const forgotPasswordOtpVerification = `
<!DOCTYPE html>
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
 </head>
  <body>
<p>Dear User {{uid}},</p>
  To reset your old password, please enter OTP {{otp}}. Do not share the OTP.</p>  
    <p>Regards,<br/>
    Steigen Healthcare <br/>
    This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:info@thito.in">info@thito.in</a></p>
  </body>
</html>
`;

//5.change verified contact details otp
export const changeVerifiedContactDetailsOTP = `
<!DOCTYPE html>
<html>
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
 </head>
  <body>
    <p>Dear User {{uid}},</p>
<p>To change your email ID, please enter OTP {{otp}}. OTP will expire in 15 min. Do not share the OTP.</p>
    <p>Regards,<br/>
    Steigen Healthcare <br/>
    This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:info@thito.in">info@thito.in</a></p>
  </body>
</html>
`;

//6.send otp to connect to existing user
export const otp_verification_existing_user = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <title>OTP Verification Request</title>
  </head>
  <body>
    <p>Dear User,</p>
    <p>{{uid}} has requested to attach your profile with his/her {{#if connectMinor}}Minor's {{/if}} profile, OTP for the same is {{otp}}. Sharing the OTP to proceed is considered as consent to attach your profile.</b></p>
    <p>Regards,<br/>
    Steigen Healthcare <br/>
    This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:info@thito.in">info@thito.in</a></p>
  </body>
</html>
`;

//7.Release Minor OTP
export const releaseMinorAccount = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <title>OTP Verification Request</title>
  </head>
  <body>
    <p>Dear User ,</p>
    <p>Your profile is getting detached from the {{uid}} account, and to create new profile please share the
      OTP {{otp}}. Sharing the OTP to proceed is considered as consent to detach your profile</p>
    <p>Regards,<br/>
    Steigen Healthcare <br/>
    This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:info@thito.in">info@thito.in</a></p>
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
    <p>Dear user,</p>

    <p>To create new profile on THITO, OTP is {{data}}, it is valid for 15 minutes. Do not share the OTP.</p>

      <p>Regards,<br/>
      Steigen Healthcare <br/>
      This is system generated email. Do not reply to this mail. If you need any support, write to <a href="mailto:info@thito.in">info@thito.in</a></p>
    
  </body>
</html>
`;
