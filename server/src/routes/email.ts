import { FastifyInstance } from 'fastify';
import { Resend } from 'resend';

export default async function emailRoutes(fastify: FastifyInstance) {

  fastify.post('/welcome', async (request, reply) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return reply.status(500).send({ error: 'RESEND_API_KEY is not configured on the server' });
    }

    const resend = new Resend(apiKey);
    const { email, name } = request.body as { email: string; name?: string };

    if (!email) {
      return reply.status(400).send({ error: 'Email address is required' });
    }

    const userName = name || email.split('@')[0] || 'there';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to JD2CV</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0F17; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background: rgba(24, 28, 36, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 24px; padding: 40px; box-shadow: 0 12px 48px rgba(124, 58, 237, 0.25);">
          
          <!-- Header Logo -->
          <tr>
            <td align="left" style="padding-bottom: 24px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed 0%, #4f378a 100%); text-align: center; vertical-align: middle;">
                    <span style="font-size: 20px; color: #ffffff; line-height: 40px;">✦</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">JD2CV</span>
                    <br>
                    <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.6); font-weight: 700;">Career Workspace</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Headline -->
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <h1 style="font-size: 28px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px 0; line-height: 1.2;">
                Welcome to JD2CV, ${userName} 👋
              </h1>
              <p style="font-size: 16px; color: rgba(255, 255, 255, 0.8); margin: 0; line-height: 1.6;">
                We're excited to have you on board! JD2CV is your AI-powered career workspace designed to optimize your resume for any target job description with Applicant Tracking System (ATS) precision.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 12px 0 24px 0;">
              <hr style="border: none; height: 1px; background: rgba(255, 255, 255, 0.1); margin: 0;">
            </td>
          </tr>

          <!-- 3-Step Quick Start Guide -->
          <tr>
            <td align="left" style="padding-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px 0;">
                🚀 Quick Start Guide (3 Simple Steps)
              </h2>
              
              <!-- Step 1 -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px;">
                <tr>
                  <td width="36" style="vertical-align: top;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(124, 58, 237, 0.2); color: #d2bbff; text-align: center; line-height: 28px; font-weight: 700; font-size: 14px;">1</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <strong style="color: #FFFFFF; font-size: 15px;">Upload Baseline Resume</strong>
                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 13px; margin: 4px 0 0 0; line-height: 1.4;">Upload your existing PDF or text resume to provide your career history context.</p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px;">
                <tr>
                  <td width="36" style="vertical-align: top;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(124, 58, 237, 0.2); color: #d2bbff; text-align: center; line-height: 28px; font-weight: 700; font-size: 14px;">2</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <strong style="color: #FFFFFF; font-size: 15px;">Paste Target Job Description</strong>
                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 13px; margin: 4px 0 0 0; line-height: 1.4;">Paste the full job post you are applying for to extract key keywords and skills.</p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px;">
                <tr>
                  <td width="36" style="vertical-align: top;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); color: #10b981; text-align: center; line-height: 28px; font-weight: 700; font-size: 14px;">3</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <strong style="color: #FFFFFF; font-size: 15px;">Run AI Customizer & Export</strong>
                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 13px; margin: 4px 0 0 0; line-height: 1.4;">Click generate to produce an ATS-matched resume and download as a formatted PDF.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Primary CTA Button -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="http://localhost:5173" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4f378a 100%); color: #FFFFFF; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);">
                Optimize Your First CV Now ➔
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="border-t: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px;">
              <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 0 0 8px 0;">
                © 2026 JD2CV AI Career Workspace. All rights reserved.
              </p>
              <p style="font-size: 11px; color: rgba(255, 255, 255, 0.4); margin: 0;">
                Sent with Resend API • ATS Optimization Engine v2.4
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      const data = await resend.emails.send({
        from: 'JD2CV Workspace <onboarding@resend.dev>',
        to: [email],
        subject: `Welcome to JD2CV Career Workspace, ${userName}! 🚀`,
        html: htmlContent
      });

      return reply.send({ success: true, data });
    } catch (err: any) {
      fastify.log.error('Resend email error:', err);
      return reply.status(500).send({ error: err.message || 'Failed to send welcome email' });
    }
  });

}
