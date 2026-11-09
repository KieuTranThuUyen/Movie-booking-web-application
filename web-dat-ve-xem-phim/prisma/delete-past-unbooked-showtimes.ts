import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
    const now = new Date();
    const candidates = await prisma.showtime.findMany({
        where: {
            endTime: { lt: now },
            bookings: { none: {} },
        },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            movie: { select: { title: true } },
            hall: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
    });

    if (candidates.length === 0) {
        console.log('Không có suất chiếu quá khứ nào chưa được đặt để xóa.');
        return;
    }

    console.log(`${dryRun ? '[DRY RUN] ' : ''}Tìm thấy ${candidates.length} suất chiếu:`);
    for (const showtime of candidates) {
        console.log(
            `- ${showtime.movie.title} | ${showtime.hall.name} | `
            + `${showtime.startTime.toISOString()} - ${showtime.endTime.toISOString()} | ${showtime.id}`,
        );
    }

    if (dryRun) {
        console.log('Chưa xóa dữ liệu. Chạy lại không có --dry-run để xóa.');
        return;
    }

    const result = await prisma.showtime.deleteMany({
        where: {
            id: { in: candidates.map((showtime) => showtime.id) },
            endTime: { lt: now },
            bookings: { none: {} },
        },
    });
    console.log(`Đã xóa ${result.count} suất chiếu không có đặt vé.`);
}

main()
    .catch((error) => {
        console.error('Không thể xóa suất chiếu:', error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
