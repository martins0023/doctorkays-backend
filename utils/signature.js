// utils/signature.js

// If you ever need to inject dynamic values (e.g. year, address), turn this into a function.
// For now, it’s a constant string:
const signatureHtml = `
<div>
  <!-- Mobile‐responsive tweaks -->
  <style type="text/css">
    @media only screen and (max-width:480px) {
      .responsive-table { width:100% !important; }
      .logo-cell,
      .info-cell {
        display:block !important;
        width:100% !important;
        padding:8px 0 !important;
        text-align:center !important;
      }
      .info-cell p { margin:6px 0 !important; }
      .social-icons { text-align:center !important; }
      .social-icons a { margin:0 6px !important; }
    }
  </style>

  <table cellpadding="0" cellspacing="0" width="100%" class="responsive-table" style="max-width:600px;">
    <tbody>
      <tr>
        <td style="border-bottom:3px solid #a1a4aa;padding-bottom:8px">
          <p style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
                    font-size:20px;font-weight:700;text-transform:uppercase;margin:0">
            <!-- Optional header text -->
          </p>
          <p style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
                    font-size:14px;color:#ff4d00;margin:5px 0 0">
            <!-- Optional subheader -->
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0">
          <table cellpadding="0" cellspacing="0" style="width:100%;">
            <tbody>
              <tr>
                <!-- Logo column -->
                <td class="logo-cell" style="width:150px;" width="150">
                  <p style="margin:0;line-height:0">
                    <img width="120" style="max-width:120px;height:auto;border:0"
                         src="https://www.doctorkays.com/logo.png" alt="Logo">
                  </p>
                </td>

                <!-- Info column -->
                <td class="info-cell" valign="top" style="line-height:1.5;">
                  <p style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
                            font-size:14px;margin:0 0 8px">
                    <span style="display:inline-block;margin-right:12px">
                      <strong style="color:#ff4d00">E:</strong>
                      <a href="mailto:support@doctorkays.com" style="text-decoration:none;color:inherit">
                        support@doctorkays.com
                      </a>
                    </span>
                    <span style="display:inline-block">
                      <strong style="color:#ff4d00">W:</strong>
                      <a href="https://www.doctorkays.com/" target="_blank" style="text-decoration:none;color:inherit">
                        www.doctorkays.com
                      </a>
                    </span>
                  </p>

                  <p style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
                            font-size:14px;margin:0 0 8px">
                    <strong style="color:#ff4d00">P:</strong> +234 813 781 2971
                  </p>

                  <p style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
                            font-size:14px;margin:0 0 8px;display:flex;align-items:flex-start;">
                    <strong style="color:#ff4d00; margin-right:4px">A:</strong>
                    <span>36 BEHIND OMIDIRAN GARDENS OSOGBO OSUN STATE</span>
                  </p>

                  <p class="social-icons" style="margin:0;padding-top:6px;height:30px;">
                    <a href="https://www.facebook.com/Doctorkays/" target="_blank" style="margin-right:8px;line-height:0">
                      <img alt="Facebook" width="24" style="max-width:24px;height:auto;border:0"
                           src="https://static.zohocdn.com/toolkit/assets/dfcd5d3551f6d8e5468b.png">
                    </a>
                    <a href="https://x.com/doctor_kays" target="_blank" style="margin-right:8px;line-height:0">
                      <img alt="Twitter" width="24" style="max-width:24px;height:auto;border:0"
                           src="https://static.zohocdn.com/toolkit/assets/5c90409a1a65fd83b061.png">
                    </a>
                    <a href="https://www.linkedin.com/" target="_blank" style="margin-right:8px;line-height:0">
                      <img alt="LinkedIn" width="24" style="max-width:24px;height:auto;border:0"
                           src="https://static.zohocdn.com/toolkit/assets/1be0da7ebe8a8b809c5f.png">
                    </a>
                    <a href="https://m.youtube.com/@Doctorkays/" target="_blank" style="margin-right:8px;line-height:0">
                      <img alt="YouTube" width="24" style="max-width:24px;height:auto;border:0"
                           src="https://static.zohocdn.com/toolkit/assets/5eba90cbc358cfc3d940.png">
                    </a>
                    <a href="https://www.instagram.com/doctor_kays/" target="_blank" style="margin-right:8px;line-height:0">
                      <img alt="Instagram" width="24" style="max-width:24px;height:auto;border:0"
                           src="https://static.zohocdn.com/toolkit/assets/55101ade296b45dc3abe.png">
                    </a>
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr class="DISCLAIMER">
        <td style="border-top:3px solid #a1a4aa;padding-top:8px">
          <p style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
                    font-size:12px;color:grey;margin:0;line-height:1.5">
            The content of this email is confidential and intended for the recipient specified in message only. It is strictly forbidden to share any part of this message with any third party, without a written consent of the sender. If you received this message by mistake, please reply to this message and follow with its deletion, so that we can ensure such a mistake does not occur in the future.
          </p>
        </td>
      </tr>
    </tbody>
  </table>
</div>
`;

module.exports = { signatureHtml };
