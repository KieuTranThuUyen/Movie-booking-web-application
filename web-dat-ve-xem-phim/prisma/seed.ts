import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const movies = [
  {
    title: 'Hộ Linh Tráng Sĩ: Bí Ẩn Mộ Vua Đinh',
    slug: 'ho-linh-trang-si-bi-an-mo-vua-dinh',
    genre: 'Hành động, Lịch sử',
    duration: 135,
    ageRating: 'T13',
    synopsis:
      'Bộ phim kể về hành trình của 7 Hộ Linh Tráng Sĩ nhận nhiệm vụ hộ vệ linh cữu vua Đinh Tiên Hoàng về nơi an táng an toàn. Họ phải đưa 99 quan tài đi theo 7 hướng khác nhau để đánh lạc hướng các thế lực thù địch đang tìm cách phá hoại lăng mộ.',
    posterUrl:
      'https://tse1.mm.bing.net/th/id/OIP.ORiERUtmXE0D_dK64TiewwHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    trailerUrl: 'https://www.youtube.com/watch?v=nLXxbMH-Jk8',
    releaseDate: new Date('2026-08-28'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Paw Patrol: Phim Khủng Long',
    slug: 'paw-patrol-phim-khung-long',
    genre: 'Hành động, Hoạt hình, Phiêu lưu',
    duration: 90,
    ageRating: 'P',
    synopsis:
      'Khi một cơn bão bí ẩn đưa đội Paw Patrol đến một hòn đảo nhiệt đới, các chú cún cứu hộ phát hiện nơi đây là vùng đất của những loài khủng long. Đội Paw Patrol phải sử dụng kỹ năng và tinh thần đồng đội để giải cứu những người bạn mới.',
    posterUrl:
      'https://vietphucinema.com/temp/-uploaded-hinhphim-2026-8_pawpatrol2026ngang1_cr_615x408.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dOnXZ28tv_w',
    releaseDate: new Date('2026-08-14'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Hẹn Em Ngày Nhật Thực',
    slug: 'hen-em-ngay-nhat-thuc',
    genre: 'Gia đình, Tình cảm',
    duration: 118,
    ageRating: 'T16',
    synopsis:
      'Năm 1995, Ân bất ngờ bị kéo trở lại quá khứ bởi những bức thư tình chưa từng trao tay. Hành trình tìm gặp Thiên - mối tình đầu từng khắc sâu trong tim - đưa cô trở về thôn Trà Mây, nơi những bí mật bị che giấu suốt nhiều năm dần được hé lộ.',
    posterUrl:
      'https://www.bing.com/images/search?view=detailV2&ccid=E3KkCMCh&id=84201FA9F745039B2FFC21686B84294FEBD827E9&thid=OIP.E3KkCMChUqdOCc6yeQ8h1wHaEG&mediaurl=https%3a%2f%2fnewsmd2fr.keeng.vn%2ftiin%2farchive%2fimageslead%2f2026%2f03%2f18%2fl0em206hs39j0lljhn347l3wc374xgyz.jpg&cdnurl=https%3a%2f%2fth.bing.com%2fth%2fid%2fR.1372a408c0a152a74e09ceb2790f21d7%3frik%3d6SfY608phGtoIQ%26pid%3dImgRaw%26r%3d0&exph=656&expw=1186&q=poster+H%e1%ba%b9n+Em+Ng%c3%a0y+Nh%e1%ba%adt+Th%e1%bb%b1c&FORM=IRPRST&ck=03A977EEA523F4ADB1E444390476F54E&selectedIndex=2&itb=0',
    trailerUrl: 'https://www.youtube.com/watch?v=xeuiol66BkA',
    releaseDate: new Date('2026-03-30'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Một Thời Ta Đã Yêu',
    slug: 'mot-thoi-ta-da-yeu',
    genre: 'Tâm lý, Tình cảm',
    duration: 119,
    ageRating: 'T16',
    synopsis:
      'Năm 2006, Bảo vừa tròn 18 tuổi và bước vào mùa hè cuối cùng của tuổi trẻ bên những người bạn thân. Sự xuất hiện của Quỳnh kéo Bảo ra khỏi quỹ đạo an toàn và mở ra một mối tình dữ dội, nhưng cũng dẫn đến những biến cố không thể quay đầu.',
    posterUrl:
      'https://th.bing.com/th/id/OIP.t6LVP-RTrPsciBdp41EAZQHaD4?w=296&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    trailerUrl: 'https://www.youtube.com/watch?v=lVibBENW-ro',
    releaseDate: new Date('2026-05-15'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Dưới Bóng Điện Hạ',
    slug: 'duoi-bong-dien-ha',
    genre: 'Lịch sử',
    duration: 117,
    ageRating: 'T16',
    synopsis:
      'Lấy mốc năm 1457 dưới triều đại Joseon, bộ phim kể về vua Danjong - vị quân vương trẻ tuổi bị chính người chú lật đổ và đày đến Cheongnyeongpo. Tại nơi lưu đày, ông gặp trưởng làng Eom Heung Do và hình thành một mối liên kết đặc biệt giữa hai con người thuộc hai thế giới khác nhau.',
    posterUrl:
      'https://th.bing.com/th/id/OIP.ysEY6Bn_41nuTKt7gTU3lAHaEK?w=298&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    trailerUrl: 'https://www.youtube.com/watch?v=aPsEOR-WK6U',
    releaseDate: new Date('2026-04-10'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Ngôi Đền Kỳ Quái 5',
    slug: 'ngoi-den-ky-quai-5',
    genre: 'Hài, Kinh dị',
    duration: 118,
    ageRating: 'T16',
    synopsis:
      'Một năm sau khi đánh bại hồn ma Nak Tinn, nhóm bạn của Balloon và First chưa kịp tận hưởng cuộc sống bình yên thì một linh hồn báo thù quay trở lại. Lần này mục tiêu là chú tiểu Nott và những người thân của cậu.',
    posterUrl:
      'https://th.bing.com/th/id/OIP.FH77MzTq2u2FRgJpV1GxSAAAAA?w=321&h=175&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    trailerUrl: null,
    releaseDate: new Date('2026-05-29'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Ai Thương Ai Mến',
    slug: 'ai-thuong-ai-men',
    genre: 'Gia đình, Hài, Tâm lý',
    duration: 112,
    ageRating: 'T16',
    synopsis:
      'Lấy bối cảnh miền Tây sông nước, Hai Mến là người phụ nữ mất cha mẹ và phải một mình gồng gánh gia đình giữa những khoản nợ và biến cố. Cô gặp Khả - một công tử ăn chơi vô tình đem lòng thương mến cô, mở ra một câu chuyện tình vừa ngọt ngào vừa nhiều thử thách.',
    posterUrl:
      'https://tse4.mm.bing.net/th/id/OIP.PTlrR0sM_ERdBQQgiGYW7QAAAA?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    trailerUrl: null,
    releaseDate: new Date('2026-01-01'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Người Đẹp Và Quái Lạ',
    slug: 'nguoi-dep-va-quai-la',
    genre: 'Hài',
    duration: 117,
    ageRating: 'T16',
    synopsis:
      'Plaifun từng là một diva nổi tiếng của Thái Lan nhưng sự nghiệp dần xuống dốc vì những tin đồn và thị phi. Khi quyết định trở lại sân khấu, cô phải đối đầu với thế hệ thần tượng Gen Z trong một cuộc chiến hài hước để giành lại ánh hào quang.',
    posterUrl:
      'https://iguov8nhvyobj.vcdn.cloud/media/catalog/product/cache/1/thumbnail/dc33889b0f8b5da88052ef70de32f1cb/d/i/diva-teaser_poster.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-01-30'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Nhà Ga Nuốt Người: Đăng Xuất',
    slug: 'nha-ga-nuot-nguoi-dang-xuat',
    genre: 'Kinh dị',
    duration: 82,
    ageRating: 'T16',
    synopsis:
      'Asuka Miyazaki từng trở về một cách kỳ diệu từ nhà ga bí ẩn Kisaragi nhưng vẫn mang dáng vẻ của cô gái mất tích 20 năm trước. Khi biết những người khác vẫn mắc kẹt tại nhà ga, Asuka quyết định quay trở lại để giải cứu họ.',
    posterUrl:
      'https://tse1.mm.bing.net/th/id/OIP.hIzxBjagjo_DNV1wqZa4_QHaCe?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    trailerUrl: null,
    releaseDate: new Date('2026-01-16'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Chuyện Tình Siam',
    slug: 'chuyen-tinh-siam',
    genre: 'Tâm lý, Tình cảm',
    duration: 158,
    ageRating: 'T16',
    synopsis:
      'Mew và Tong là những người bạn thuở ấu thơ bị chia cắt bởi bi kịch gia đình. Nhiều năm sau, họ tái ngộ tại Quảng trường Siam và những tình cảm trong sáng năm xưa dần trở lại.',
    posterUrl:
      'https://tse4.mm.bing.net/th/id/OIP.LGldPvYty96Lne9z-w-kbQHaJQ?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    trailerUrl: null,
    releaseDate: new Date('2026-01-16'),
    isNowShowing: true,
    isComingSoon: false,
  },

  {
    title: 'Superman',
    slug: 'superman',
    genre: 'Hành động, Phiêu lưu',
    duration: 130,
    ageRating: 'T13',
    synopsis:
      'James Gunn mang Superman trở lại màn ảnh với một phiên bản mới của người hùng huyền thoại trong vũ trụ DC. Superman được khắc họa như một người hùng giàu lòng trắc ẩn, luôn tin tưởng vào điều tốt đẹp của con người.',
    posterUrl:
      'https://tse3.mm.bing.net/th/id/OIP._XHOrA2ksVKSEaB8v8qJFwHaK-?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    trailerUrl: 'https://www.youtube.com/watch?v=3Pgi3Njb5OE',
    releaseDate: new Date('2025-07-11'),
    isNowShowing: false,
    isComingSoon: false,
  },

  {
    title: 'The Conjuring: Nghi Lễ Cuối Cùng',
    slug: 'the-conjuring-nghi-le-cuoi-cung',
    genre: 'Kinh dị',
    duration: 136,
    ageRating: 'T16',
    synopsis:
      'Ed và Lorraine Warren đối mặt với một vụ án cuối cùng khi một thế lực tà ác gieo rắc kinh hoàng cho gia đình Smurl trong suốt nhiều năm. Bộ phim được lấy cảm hứng từ một trong những vụ án có thật mà gia đình Warren từng điều tra.',
    posterUrl:
      'https://starlight.vn/Areas/Admin/Content/Fileuploads/images/Poster2024/The-conjuring-Nghi-le-cuoi-cung.jpg',
    trailerUrl: null,
    releaseDate: new Date('2025-09-12'),
    isNowShowing: false,
    isComingSoon: false,
  },
];

async function main() {
  console.log(`Seeding ${movies.length} movies...`);

  for (const movie of movies) {
    await prisma.movie.upsert({
      where: {
        slug: movie.slug,
      },
      update: movie,
      create: movie,
    });
  }

  console.log(`Seeded ${movies.length} movies.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

