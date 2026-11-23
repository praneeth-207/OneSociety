import { Complaint } from '../models/complaint.model.js';
import { Society } from '../../../core/models/society.model.js';
import { User } from '../../../core/models/user.model.js';
import { notificationService } from '../../../core/notifications/notification.service.js';
import { Roles } from '../../../core/rbac/roles.js';

export class EscalationService {
  public async runIdempotentEscalationCheck(): Promise<{ checked: number; escalationsSent: number }> {
    const now = new Date();
    const openComplaints = await Complaint.find({
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'] },
    });

    let escalationsSent = 0;

    for (const complaint of openComplaints) {
      const society = await Society.findById(complaint.societyId);
      const settings = society?.settings || {
        escalationHoursHigh: 4,
        escalationHoursMedium: 24,
        escalationHoursLow: 72,
        maxReopenLimit: 2,
      };

      const ageHours = (now.getTime() - complaint.createdAt.getTime()) / (1000 * 60 * 60);

      // 1. Assignment SLA Escalation
      if (!complaint.escalationFlags.overdueAssignmentSent && complaint.status === 'UNDER_REVIEW') {
        let maxAllowedHours = settings.escalationHoursLow;
        if (complaint.priority === 'HIGH') maxAllowedHours = settings.escalationHoursHigh;
        else if (complaint.priority === 'MEDIUM') maxAllowedHours = settings.escalationHoursMedium;

        if (ageHours > maxAllowedHours) {
          complaint.escalationFlags.overdueAssignmentSent = true;
          await complaint.save();

          const president = await User.findOne({ societyId: complaint.societyId, role: Roles.PRESIDENT });
          if (president) {
            await notificationService.send({
              societyId: complaint.societyId,
              recipientId: president._id,
              title: `SLA BREACH: ${complaint.complaintId} Unassigned`,
              message: `${complaint.priority} priority complaint has been pending assignment for >${Math.round(ageHours)} hours!`,
              type: 'ALERT',
              module: 'COMPLAINTS',
              linkId: complaint._id.toString(),
            });
            escalationsSent++;
          }
        }
      }

      // 2. Overdue Resolution Escalation
      if (
        !complaint.escalationFlags.overdueResolutionSent &&
        complaint.status === 'IN_PROGRESS' &&
        complaint.assignment?.expectedCompletionDate
      ) {
        if (now > complaint.assignment.expectedCompletionDate) {
          complaint.escalationFlags.overdueResolutionSent = true;
          await complaint.save();

          const president = await User.findOne({ societyId: complaint.societyId, role: Roles.PRESIDENT });
          if (president) {
            await notificationService.send({
              societyId: complaint.societyId,
              recipientId: president._id,
              title: `PROVIDER OVERDUE: ${complaint.complaintId}`,
              message: `Assigned provider is past expected completion date for ${complaint.complaintId}`,
              type: 'ALERT',
              module: 'COMPLAINTS',
              linkId: complaint._id.toString(),
            });
            escalationsSent++;
          }
        }
      }
    }

    return { checked: openComplaints.length, escalationsSent };
  }
}

export const escalationService = new EscalationService();
