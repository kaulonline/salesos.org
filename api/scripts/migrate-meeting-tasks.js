const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateMeetingTasks() {
    // Find tasks that look like scheduled meetings
    const meetingTasks = await prisma.task.findMany({
        where: {
            OR: [
                { subject: { contains: 'Meeting with' } },
                { description: { contains: 'Scheduled via email thread' } },
                { description: { contains: 'Join URL' } },
            ]
        },
        orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${meetingTasks.length} meeting-related tasks`);

    for (const task of meetingTasks) {
        try {
            // Extract join URL from description
            const urlMatch = task.description?.match(/Join URL: (https:\/\/[^\s]+)/);
            const joinUrl = urlMatch ? urlMatch[1] : null;

            // Check if MeetingSession already exists
            const existing = await prisma.meetingSession.findFirst({
                where: { meetingUrl: joinUrl }
            });

            if (existing) {
                console.log(`⏭️  Skipping - MeetingSession already exists: ${existing.id}`);
                continue;
            }

            // Parse title (remove "Meeting with Name: " prefix)
            const titleMatch = task.subject.match(/Meeting with [^:]+: (.+)/);
            const meetingTitle = titleMatch ? titleMatch[1] : task.subject;

            // Parse recipient name
            const nameMatch = task.subject.match(/Meeting with ([^:]+):/);
            const recipientName = nameMatch ? nameMatch[1] : 'Unknown';

            // Create MeetingSession
            const session = await prisma.meetingSession.create({
                data: {
                    title: meetingTitle,
                    platform: 'ZOOM',
                    meetingUrl: joinUrl,
                    scheduledStart: task.dueDate,
                    scheduledEnd: new Date(task.dueDate.getTime() + 30 * 60 * 1000),
                    description: `Meeting with ${recipientName}`,
                    ownerId: task.ownerId,
                    leadId: task.leadId || null,
                    accountId: task.accountId || null,
                    opportunityId: task.opportunityId || null,
                    status: 'SCHEDULED',
                    recordingStatus: 'NOT_STARTED',
                    metadata: {
                        migratedFromTask: task.id,
                        recipientName: recipientName,
                    },
                },
            });

            console.log(`✅ Created MeetingSession: ${session.id}`);
            console.log(`   Title: ${session.title}`);
            console.log(`   Scheduled: ${session.scheduledStart}`);
            console.log(`   URL: ${session.meetingUrl}`);
        } catch (error) {
            console.error(`❌ Error processing task ${task.id}:`, error.message);
        }
    }

    await prisma.$disconnect();
    console.log('\nMigration complete!');
}

migrateMeetingTasks().catch(console.error);
