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
      'https://tse1.mm.bing.net/th/id/OIP.CfILW1uhX6paP1So2_JQVQHaCz?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    imageUrl:
      'https://marieclaire.vn/media/full/2026/04/ho_linh_trang_si_9-jpg.jpg',
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
    imageUrl:
      'https://tse1.mm.bing.net/th/id/OIP.SLPf3jyoGr7dQCC2guX22QAAAA?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
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
      'https://bazaarvietnam.vn/wp-content/uploads/2026/02/hen-em-ngay-nhat-thuc-doan-thien-an-khuong-le-bzvn-1536x861.jpg',
    imageUrl:
      'https://tse1.mm.bing.net/th/id/OIP.lSyT1A-ZAm1NekurHperAgHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    trailerUrl: 'https://www.youtube.com/watch?v=xeuiol66BkA',
    releaseDate: new Date('2026-04-03'),
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
    imageUrl:
      'https://tse1.explicit.bing.net/th/id/OIP.punF27ryN6K3H0SNYBadXQAAAA?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
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
    imageUrl:
      'https://tse1.mm.bing.net/th/id/OIP.mnjl1hgPHEbOScEonujAZwHaJQ?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
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
    imageUrl:
      'https://st.download.com.vn/data/image/2026/05/23/ngoi-den-ky-quai-5-1.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=nkf0xTzfTGo',
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
    imageUrl:
      'https://tse1.mm.bing.net/th/id/OIP.XY95tCDypbkXrQkgVc80OQHaJQ?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    trailerUrl: 'https://www.youtube.com/watch?v=vLIh-mEuuTc',
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
    imageUrl:
      'https://thegioidienanh.vn/stores/news_dataimages/2026/012026/15/16/main-poster20260115162900.jpg?rt=20260115162928',
    trailerUrl: 'https://www.youtube.com/watch?v=4u0ah3-zWJA',
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
    imageUrl:
      'https://tse2.mm.bing.net/th/id/OIP.lHa7PE2zhBbc8iTpVemTyAAAAA?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    trailerUrl: 'https://www.youtube.com/watch?v=mxyry5al904',
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
    imageUrl:
      'https://kenh14cdn.com/2020/10/5/untitled-15745801592731179702002-1601879074667224196661.png',
    trailerUrl: 'https://www.youtube.com/watch?v=V7LtJYVJqu4&source_ve_path=NzY3NTg&embeds_referring_euri=https%3A%2F%2Fwww.bing.com%2F&embeds_referring_origin=https%3A%2F%2Fwww.bing.com',
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
      'https://tse3.mm.bing.net/th/id/OIP.DjRSL4TTsywjyjLjrvA7zgHaJ3?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    imageUrl:
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
      'https://iguov8nhvyobj.vcdn.cloud/media/catalog/product/cache/1/image/1800x/71252117777b696995f01934522c402d/1/0/1080wx608h-conjuring.jpg',
    imageUrl:
      'https://starlight.vn/Areas/Admin/Content/Fileuploads/images/Poster2024/The-conjuring-Nghi-le-cuoi-cung.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=sbsNPOzdBg0&t=3s',
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

