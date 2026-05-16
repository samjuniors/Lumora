import { dbService } from './dbProvider';

export async function queueEmailNotification(to: string | string[], subject: string, html: string, text?: string) {
  try {
    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length === 0) return;

    const fullHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h1 style="color: #6366f1; font-weight: 900; margin-bottom: 20px;">Lumora Academy</h1>
        <div style="font-size: 16px; line-height: 1.6; color: #1e293b;">
          ${html}
        </div>
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This is an automated notification from Lumora Platform. Please do not reply.
        </p>
      </div>
    `;

    // Try calling our backend API
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipients,
        subject,
        html: fullHtml,
        text: text || html.replace(/<[^>]*>?/gm, '')
      })
    });

    if (!response.ok) {
      console.warn("API email failed");
    }
  } catch (err) {
    console.error("Email notification error:", err);
  }
}

export async function notifyStudentsOfNewAssignment(title: string, description: string, allowedStudents?: string[]) {
  try {
    const students = await dbService.getUsersByRole('student');
    let studentEmails: string[] = [];
    
    if (allowedStudents && allowedStudents.length > 0) {
      studentEmails = students
        .filter(u => allowedStudents.includes(u.id))
        .map(u => u.email)
        .filter(Boolean);
    } else {
      studentEmails = students.map(u => u.email).filter(Boolean);
    }

    if (studentEmails.length > 0) {
      await queueEmailNotification(
        studentEmails,
        `New Mission Blast: ${title}`,
        `<p>A new mission has been deployed: <strong>${title}</strong></p><p>${description}</p><p><a href="https://app.samjuniors.com/assignments" style="background: #6366f1; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 10px;">View Mission</a></p>`
      );
    }
  } catch (err) {
    console.error("New assignment notification failed:", err);
  }
}

export async function notifyStudentOfDeadline(studentEmail: string, studentName: string, assignmentTitle: string, dueDate: number) {
  const dateStr = new Date(dueDate).toLocaleString();
  await queueEmailNotification(
    studentEmail,
    `Deadline Approaching: ${assignmentTitle}`,
    `<p>Hey ${studentName},</p><p>This is a reminder that the mission <strong>${assignmentTitle}</strong> is ending soon.</p><p><strong>Deadline:</strong> ${dateStr}</p><p>Don't miss out on your bonus rewards!</p>`
  );
}
