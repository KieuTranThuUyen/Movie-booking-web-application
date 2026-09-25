import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/*
 * Trailer:
 * - Một số trailer đã xác minh là video YouTube cụ thể.
 * - Phim chưa xác minh được video ID chính thức dùng URL tìm kiếm YouTube
 *   để tránh gán nhầm trailer của phim khác.
 */

/* =========================================================
 * MOVIES
 * Dữ liệu phim đang chiếu + phim sắp chiếu từ danh sách CGV.
 * Phim có releaseDate trong tương lai được đánh dấu:
 *   isNowShowing = false
 *   isComingSoon = true
 * ========================================================= */

const movies = [
  {
    title: 'AVENGERS: HỒI KẾT - PHIÊN BẢN ĐẶC BIỆT (CHIẾU LẠI)',
    slug: 'avengers-hoi-ket-phien-ban-dac-biet-chieu-lai',
    genre: 'Hành Động, Khoa Học Viễn Tưởng, Phiêu Lưu',
    duration: 183,
    ageRating: 'T13',
    synopsis: 'Chuỗi sự kiện nghiệt ngã do Thanos khởi nguồn đã xóa sổ một nửa sự sống trong vũ trụ và khiến đội ngũ Avengers tan tác. Những thành viên còn lại buộc phải tập hợp một lần nữa để bước vào trận chiến cuối cùng trong Avengers: Hồi Kết.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/e/n/encore_alt_1sht_-_rgb_online_only.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/e/n/encore_alt_1sht_-_rgb_online_only.jpg',
    trailerUrl: 'https://www.youtube.com/embed/XsDQf4EsZIs?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-25'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'TRẠI BUÔN NGƯỜI',
    slug: 'trai-buon-nguoi',
    genre: 'Hành Động, Hồi hộp',
    duration: 135,
    ageRating: 'T18',
    synopsis: 'Vì cứu em gái sa bẫy buôn người ở biên giới miền Tây, Ny cùng bạn thân bị bắt làm nô dịch trong một sào huyệt lừa đảo tàn bạo. Tại đây, họ cùng các trinh sát nằm vùng và những nạn nhân khác âm thầm lập kế hoạch trốn thoát.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-tbn.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-tbn.jpg',
    trailerUrl: 'https://www.youtube.com/embed/xGiimAKN0TM?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-25'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'VÙNG ĐẤT QUỶ DỮ',
    slug: 'vung-dat-quy-du',
    genre: 'Hành Động, Kinh Dị',
    duration: 94,
    ageRating: 'T18',
    synopsis: 'Bryan, một nhân viên vận chuyển vật tư y tế, vô tình bị cuốn vào cuộc chạy đua sinh tồn trong một đêm định mệnh. Khi hàng loạt sự kiện kinh hoàng liên tiếp xảy ra, anh phải tìm cách sống sót giữa thế giới zombie và một mối đe dọa không thể đoán trước.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-residentevil_1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-residentevil_1.jpg',
    trailerUrl: 'https://www.youtube.com/embed/GWWJrOYzJZY?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-18'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'HÒN ĐẢO QUÊN LÃNG',
    slug: 'hon-dao-quen-lang',
    genre: 'Hoạt Hình, Phiêu Lưu',
    duration: 109,
    ageRating: 'K',
    synopsis: 'Jo và Raissa, đôi bạn thân thời thơ ấu, tình cờ phát hiện một cánh cổng đưa họ đến hòn đảo Nakali đầy sinh vật thần thoại. Cùng những người bạn mới, họ phải đối mặt với Manananggal và phát hiện rằng cái giá để trở về nhà chính là ký ức về tình bạn của mình.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/f/i/fid_trio_470x700.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/f/i/fid_trio_470x700.jpg',
    trailerUrl: 'https://www.youtube.com/embed/vd1wzfi8-HI?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-25'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'ÚT LAN 2',
    slug: 'ut-lan-2',
    genre: 'Kinh Dị',
    duration: 107,
    ageRating: 'T18',
    synopsis: 'Một con rắn hai đầu xuất hiện bên dòng sông và kéo theo hàng loạt cái chết bí ẩn. Khi những bí mật bị lãng quên dần trồi lên mặt nước, người dân nhận ra một lời nguyền cổ xưa chưa bao giờ thực sự biến mất.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-utlan_1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-utlan_1.jpg',
    trailerUrl: 'https://www.youtube.com/embed/2xpkMDMDksE?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-25'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'LÊN HƯƠNG',
    slug: 'len-huong',
    genre: 'Gia đình, Tâm Lý',
    duration: 121,
    ageRating: 'T16',
    synopsis: 'Một bà chủ trại hòm ế ẩm và một thanh niên đang cần tiền chữa bệnh cho mẹ vô tình mắc vào một giao kèo định mệnh. Khi cùng tìm cách thay đổi số phận, họ dần phát hiện bí mật về một món nợ đã bị chôn vùi nhiều năm.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-lh_1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-lh_1.jpg',
    trailerUrl: 'https://www.youtube.com/embed/tMu23yKJ9_c?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-18'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'PHÁO HOA LÚC BÌNH MINH',
    slug: 'phao-hoa-luc-binh-minh',
    genre: 'Hoạt Hình',
    duration: 76,
    ageRating: 'P',
    synopsis: 'Khi xưởng pháo hoa Obinata đứng trước nguy cơ biến mất vì quá trình tái phát triển đô thị, Keitaro quyết tâm hoàn thành quả pháo hoa huyền thoại Shuhari mà cha mình để lại. Cùng Kaoru và Sentaro, cậu đối diện với ký ức, tình bạn và lựa chọn giữa quá khứ với một bình minh mới.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-dawn.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-dawn.jpg',
    trailerUrl: 'null',
    releaseDate: new Date('2026-09-25'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'LAPUTA: LÂU ĐÀI TRÊN KHÔNG',
    slug: 'laputa-lau-dai-tren-khong',
    genre: 'Hoạt Hình',
    duration: 129,
    ageRating: 'K',
    synopsis: 'LAPUTA: LÂU ĐÀI TRÊN KHÔNG là bộ phim thuộc thể loại Hoạt Hình, đang được trình chiếu tại rạp.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/u/outlined_poster_castle-in-the-sky.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/u/outlined_poster_castle-in-the-sky.jpg',
    trailerUrl: 'https://www.youtube.com/embed/0P8vhBmiA14?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-25'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'MARNIE YÊU DẤU',
    slug: 'marnie-yeu-dau',
    genre: 'Hoạt Hình',
    duration: 103,
    ageRating: 'K',
    synopsis: 'Một cô bé cô đơn kết bạn với Marnie, cô gái bí ẩn sống trong một căn biệt thự bên đầm phá. Qua những cuộc gặp gỡ kỳ lạ giữa thực tại và ký ức, cô bé dần khám phá những bí mật về Marnie và chính gia đình mình.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/u/outlined_poster_when-marnie-was-there.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/u/outlined_poster_when-marnie-was-there.jpg',
    trailerUrl: 'https://www.youtube.com/embed/g3KES9FASh8?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-18'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'BÓNG MA NHÀ HÁT',
    slug: 'bong-ma-nha-hat',
    genre: 'Hài, Kinh Dị',
    duration: 97,
    ageRating: 'T16',
    synopsis: 'Tuấn, một chuyên viên bất động sản tham vọng, được giao nhiệm vụ vực dậy một nhà hát cũ. Tại đây anh phát hiện nhà hát bị ám bởi Nhã, một nữ diễn viên chết oan. Khi tình cũ của Nhã xuất hiện, Tuấn và những người trong rạp phải tìm cách cứu nhà hát bằng một kế hoạch vừa kỳ quặc vừa nguy hiểm.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/b/_/b_ng_ma_nh_h_t_-_kh_i_chi_u_t_i_r_p_18.09.2026_-_kt_chu_n.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/b/_/b_ng_ma_nh_h_t_-_kh_i_chi_u_t_i_r_p_18.09.2026_-_kt_chu_n.jpg',
    trailerUrl: 'https://www.youtube.com/embed/JVIvl_ux298?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-18'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'TẾ NHI CẢI MỆNH',
    slug: 'te-nhi-cai-menh',
    genre: 'Kinh Dị',
    duration: 104,
    ageRating: 'T18',
    synopsis: 'Vì nợ cờ bạc chồng chất, Chấn Khải cùng vợ và gia đình phải chuyển nhà để trốn chủ nợ. Anh tìm đến tà thuật cấm kỵ và hiến tế vận mệnh của con trai để đổi lấy tiền, nhưng nghi lễ nhanh chóng kéo cả gia đình vào chuỗi hiện tượng kinh hoàng.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-tenhi.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-tenhi.jpg',
    trailerUrl: 'https://www.youtube.com/embed/kuIsfKAQmuY?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-18'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'YÊU NHÂN THẦN THÁM: KỲ ÁN TRƯỜNG AN',
    slug: 'yeu-nhan-than-tham-ky-an-truong-an',
    genre: 'Hoạt Hình',
    duration: 116,
    ageRating: 'K',
    synopsis: 'Giữa Trường An kỳ ảo thời Đường, Địch Thiếu – một thiếu niên thiên tài muốn trở thành đại thám tử – cùng A Sa, một tân binh yêu sói, điều tra một vụ án mạng bí ẩn. Những manh mối dần dẫn họ đến một bí mật lớn đang bị che giấu giữa thành Trường An.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-demon.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-demon.jpg',
    trailerUrl: 'https://www.youtube.com/embed/-f9pxNdJ8K8?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-18'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'NGHỈ HÈ SỢ NGHỈ HƯU',
    slug: 'nghi-he-so-nghi-huu',
    genre: 'Gia đình, Hài',
    duration: 117,
    ageRating: 'T13',
    synopsis: 'Một người cháu trai thuộc thế hệ Z và người ông là cựu chiến binh bị đặt vào những tình huống đối lập giữa lối sống hiện đại và truyền thống. Các yếu tố gia đình, tâm linh và hài hước tạo nên hành trình để hai thế hệ hiểu nhau hơn.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/z/8/z8075966316749_9fe6a8561d68d468b30c090e068011b7.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/z/8/z8075966316749_9fe6a8561d68d468b30c090e068011b7.jpg',
    trailerUrl: 'https://www.youtube.com/embed/Yg2CKr3WpQk?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-21'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'HOPE VÙNG TỬ ĐỊA',
    slug: 'hope-vung-tu-dia',
    genre: 'Hành Động, Hồi hộp, Khoa Học Viễn Tưởng',
    duration: 157,
    ageRating: 'T16',
    synopsis: 'Tại Hope Harbor, cảnh sát trưởng Bum-seok nhận tin báo về sự xuất hiện của một con hổ gần khu vực phi quân sự. Khi cả ngôi làng chìm trong hoảng loạn, ông phát hiện đằng sau sự việc là một sự thật vượt xa những gì con người có thể tưởng tượng.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/h/o/hop_mainposter_470x700.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/h/o/hop_mainposter_470x700.jpg',
    trailerUrl: 'https://www.youtube.com/embed/WjcyzHQkumU?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-04'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'QUÝ TỬ VƯỢT GIÀU',
    slug: 'quy-tu-vuot-giau',
    genre: 'Gia đình, Hài',
    duration: 118,
    ageRating: 'K',
    synopsis: 'Vợ chồng Diệp – Phát cố gắng nuôi dạy con trai Phú Quý bằng cách tạo ra một cuộc sống lẫn lộn giữa giàu và nghèo, thật và giả. Khi Phú Quý trưởng thành và có những lựa chọn khác với kỳ vọng của cha mẹ, hàng loạt tình huống dở khóc dở cười buộc cả gia đình phải nhìn lại cách họ yêu thương và lắng nghe nhau.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/q/t/qtvg_main_poster.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/q/t/qtvg_main_poster.jpg',
    trailerUrl: 'https://www.youtube.com/embed/cQPG-fOg7qE?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-28'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'MÃI NỢ MỘT LỜI TẠM BIỆT',
    slug: 'mai-no-mot-loi-tam-biet',
    genre: 'Gia đình, Tâm Lý',
    duration: 120,
    ageRating: 'K',
    synopsis: 'Daniel là một người đàn ông trưởng thành nhưng vẫn mắc kẹt trong những ký ức của tuổi thơ. Hành trình tìm lại những mảnh ký ức đã mất đưa anh trở về với gia đình, những mất mát và lời tạm biệt mà anh chưa từng kịp nói.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/m/_/m_i_n_m_t_l_i_t_m_bi_t_-_payoff_poster_-_kc_11092026.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/m/_/m_i_n_m_t_l_i_t_m_bi_t_-_payoff_poster_-_kc_11092026.jpg',
    trailerUrl: 'https://www.youtube.com/embed/OYA30XqHg94?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-11'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'CỔ THUẬT HẮC NGẢI',
    slug: 'co-thuat-hac-ngai',
    genre: 'Kinh Dị',
    duration: 86,
    ageRating: 'T16',
    synopsis: 'Một nhóm YouTuber chuyên khám phá hiện tượng siêu nhiên vô tình đánh thức một lời nguyền chết chóc khi thực hiện chuyến ghi hình tại Thái Lan. Họ phải tìm đến một pháp sư và chạy đua với thời gian trước khi tà thuật biến họ thành những nạn nhân tiếp theo.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-kongtao.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-kongtao.jpg',
    trailerUrl: 'https://www.youtube.com/embed/xS78twDlk2Q?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-11'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'BÙA YÊU: BÍ MẬT GIA TỘC',
    slug: 'bua-yeu-bi-mat-gia-toc',
    genre: 'Thần thoại, Tình cảm',
    duration: 130,
    ageRating: 'T13',
    synopsis: 'BÙA YÊU: BÍ MẬT GIA TỘC là bộ phim thuộc thể loại Thần thoại, Tình cảm, đang được trình chiếu tại rạp.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/v/n/vn_pmag2_main_685mmw_x_1015mmh_resize.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/v/n/vn_pmag2_main_685mmw_x_1015mmh_resize.jpg',
    trailerUrl: 'https://www.youtube.com/embed/TT7xIH_JNiI?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-11'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'CHIIKAWA: BÍ MẬT ĐẢO NGƯỜI CÁ',
    slug: 'chiikawa-bi-mat-dao-nguoi-ca',
    genre: 'Hoạt Hình',
    duration: 99,
    ageRating: 'P',
    synopsis: 'Chiikawa, Hachiware và Usagi nhận lời mời đến một hòn đảo với phần thưởng và đồ ăn miễn phí. Cùng Rakko, cả nhóm phát hiện hòn đảo ẩn chứa những bí mật lâu đời liên quan đến người cá và phải đối mặt với những điều kỳ bí phía sau lời mời hấp dẫn.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-chiikawa.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-chiikawa.jpg',
    trailerUrl: 'https://www.youtube.com/embed/8LJm14u1o-E?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-28'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'BÁT TIÊN ! TRUY TÌM LƯU LY ĐĂNG',
    slug: 'bat-tien-truy-tim-luu-ly-dang',
    genre: 'Hoạt Hình, Thần thoại',
    duration: 144,
    ageRating: 'K',
    synopsis: 'Tám phàm nhân với tám giấc mộng đổi đời đột nhập Bồng Lai để đánh cắp bảo vật. Nhưng phi vụ khiến họ bị cuốn vào âm mưu nơi Thiên Đình và phải đối đầu với một vị thần quyền năng, từ những kẻ vô danh trở thành những người nắm giữ vận mệnh Tam Giới.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-battien.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-battien.jpg',
    trailerUrl: 'https://www.youtube.com/embed/5N8jvHVtlko?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-11'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'HỘ LINH TRÁNG SĨ - Bí Ẩn Mộ Vua Đinh (RÚT GỌN)',
    slug: 'ho-linh-trang-si-bi-an-mo-vua-dinh-rut-gon',
    genre: 'Hành Động',
    duration: 135,
    ageRating: 'T13',
    synopsis: 'Bảy Hộ Linh Tráng Sĩ nhận nhiệm vụ cuối cùng: đưa 99 quan tài của Đinh Tiên Hoàng Đế theo bảy hướng khác nhau để đánh lừa kẻ thù và bảo vệ lăng mộ. Nhưng bên trong những chiếc quan tài có thể ẩn chứa một bí mật lớn hơn lịch sử được ghi lại.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/b/_/b_n_r_t_g_n_700x1000px.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/b/_/b_n_r_t_g_n_700x1000px.jpg',
    trailerUrl: 'https://www.youtube.com/embed/TO6Vb2c4PAY?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-28'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'MA TÙ',
    slug: 'ma-tu',
    genre: 'Hài, Kinh Dị',
    duration: 104,
    ageRating: 'T18',
    synopsis: 'Một tù nhân bí ẩn xuất hiện trong nhà tù khét tiếng bạo lực của Indonesia, mang theo một thực thể siêu nhiên chỉ săn lùng những người có năng lượng tiêu cực. Để sống sót, các tù nhân buộc phải hợp tác và thay đổi bản thân trước khi lần lượt trở thành nạn nhân.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-cell.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-cell.jpg',
    trailerUrl: 'https://www.youtube.com/embed/w0MIgDqwZBA?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-04'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'MỘT ĐÊM DUY NHẤT',
    slug: 'mot-dem-duy-nhat',
    genre: 'Hài, Tình cảm',
    duration: 103,
    ageRating: 'T18',
    synopsis: 'Allie và Owen, hai người xa lạ đang tìm kiếm một tình yêu có ý nghĩa, tình cờ gặp nhau giữa New York vào một đêm đặc biệt. Hàng loạt tình huống trớ trêu khiến họ liên tục tìm thấy rồi lại đánh mất nhau, cho đến khi nhận ra điều mình thực sự tìm kiếm có thể ở gần hơn tưởng tượng.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/n/ono_teaser_470x700.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/n/ono_teaser_470x700.jpg',
    trailerUrl: 'https://www.youtube.com/embed/8ztytNECzi8?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-09-04'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'PHIM SHIN – CẬU BÉ BÚT CHÌ: KỲ KỲ QUÁI QUÁI! KỲ NGHỈ YÊU QUÁI CỦA TỚ',
    slug: 'phim-shin-cau-be-but-chi-ky-ky-quai-quai-ky-nghi-yeu-quai-cua-to',
    genre: 'Hoạt Hình, Thần thoại',
    duration: 101,
    ageRating: 'P',
    synopsis: 'Shin và gia đình Nohara về quê nghỉ hè tại Akita nhưng một sự kiện kỳ lạ khiến họ lạc vào Xứ sở Yêu quái. Shin phải cùng gia đình đối mặt với những yêu quái vừa đáng sợ vừa hài hước trong một chuyến phiêu lưu kỳ ảo nhưng vẫn đậm tình cảm gia đình.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-shin.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-shin.jpg',
    trailerUrl: 'https://www.youtube.com/embed/jBFzXQQ4aR4?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-21'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'TÀU BUÔN NGƯỜI',
    slug: 'tau-buon-nguoi',
    genre: 'Hành Động, Hồi hộp, Tội phạm',
    duration: 95,
    ageRating: 'T18',
    synopsis: 'Cole Reed chứng kiến ông chủ tỷ phú bị sát hại rồi bị biến thành kẻ thế thân và vu oan. Anh đột nhập lên một tàu chở hàng để truy tìm sự thật và trả thù, nhưng chuyến đi nhanh chóng phơi bày một âm mưu quốc tế nguy hiểm.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-mutiny.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-mutiny.jpg',
    trailerUrl: 'https://www.youtube.com/embed/SJElX8y4Joc?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-28'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'QUỶ QUYỆT: RANH GIỚI VÔ ĐỊNH',
    slug: 'quy-quyet-ranh-gioi-vo-dinh',
    genre: 'Kinh Dị',
    duration: 106,
    ageRating: 'T16',
    synopsis: 'Gemma, một người mẹ trẻ sống trong chính ngôi nhà thời thơ ấu, phát hiện mình có khả năng du hành vào The Further – một cõi không gian siêu nhiên. Khả năng ấy cho phép cô đưa những thực thể từ thế giới bên kia trở về thực tại, kéo theo những nguy hiểm ngày càng lớn.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/i/s/is6_intl_online_1080x1350_tsr_bluehands_02_1_.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/i/s/is6_intl_online_1080x1350_tsr_bluehands_02_1_.jpg',
    trailerUrl: 'https://www.youtube.com/embed/PwX6QDl8dTU?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-21'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'PAW PATROL: PHIM KHỦNG LONG',
    slug: 'paw-patrol-phim-khung-long',
    genre: 'Hành Động, Hoạt Hình, Phiêu Lưu',
    duration: 89,
    ageRating: 'P',
    synopsis: 'Khi con tàu của PAW Patrol gặp bão và trôi dạt đến một hòn đảo nhiệt đới, nhóm cún cứu hộ phát hiện nơi đây vẫn có khủng long sinh sống. Rex, một chuyên gia về khủng long, giúp họ đối phó với Humdinger, kẻ vô tình đánh thức một ngọn núi lửa khổng lồ.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-paw.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-paw.jpg',
    trailerUrl: 'https://www.youtube.com/embed/2wk0Yi6nQRg?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-14'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'NGƯỜI NHỆN: KHỞI ĐẦU MỚI',
    slug: 'nguoi-nhen-khoi-dau-moi',
    genre: 'Hành Động, Phiêu Lưu, Thần thoại',
    duration: 145,
    ageRating: 'T13',
    synopsis: 'NGƯỜI NHỆN: KHỞI ĐẦU MỚI là bộ phim thuộc thể loại Hành Động, Phiêu Lưu, Thần thoại, đang được trình chiếu tại rạp.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/s/p/spiderman.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/s/p/spiderman.jpg',
    trailerUrl: 'https://www.youtube.com/embed/-aUE6APXrc0?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-07-31'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'THE ODYSSEY',
    slug: 'the-odyssey',
    genre: 'Hành Động, Thần thoại',
    duration: 173,
    ageRating: 'T16',
    synopsis: 'Odysseus lên đường trở về nhà sau cuộc chiến thành Troy nhưng phải vượt qua hàng loạt thử thách thần thoại, từ Polyphemus đến những nàng tiên cá và Circe. Hành trình cuối cùng đưa ông trở về với Penelope và quê hương Ithaca.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/d/ody_horseposter_470x700.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/d/ody_horseposter_470x700.jpg',
    trailerUrl: 'https://www.youtube.com/embed/vRYJwJIdpjs?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-07-17'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'KHÔNG CÒN CHÚNG TA (CHIẾU LẠI)',
    slug: 'khong-con-chung-ta-chieu-lai',
    genre: 'Tâm Lý, Tình cảm',
    duration: 114,
    ageRating: 'T13',
    synopsis: 'Jeong-won và Eun-ho từng yêu nhau sâu đậm trong những năm tháng đẹp nhất của tuổi trẻ nhưng rồi chia xa vì sự non nớt và những lựa chọn khác nhau. Nhiều năm sau, họ gặp lại và nhận ra tình yêu cùng những tổn thương năm xưa đã giúp cả hai trưởng thành.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470_x_700-rerun.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470_x_700-rerun.jpg',
    trailerUrl: 'https://www.youtube.com/embed/DltytoKP7Rg?rel=0&showinfo=0&autoplay=1',
    releaseDate: new Date('2026-08-21'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'TRÁI TIM QUÁI THÚ',
    slug: 'trai-tim-quai-thu',
    genre: 'Hành Động',
    duration: 101,
    ageRating: 'T13',
    synopsis: 'Sau một vụ tai nạn máy bay, sĩ quan đặc nhiệm James Belmont và chú chó chiến đấu Odin mắc kẹt giữa vùng hoang dã Alaska. Hai người bạn đồng hành phải chiến đấu với thiên nhiên khắc nghiệt và tìm cách sống sót.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-heartofthebeast.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-heartofthebeast.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-02'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'THẦN SƯ CHUNG QUỲ: LINH GIỚI ĐẠI CHIẾN',
    slug: 'than-su-chung-quy-linh-gioi-dai-chien',
    genre: 'Hành Động, Hoạt Hình, Phiêu Lưu, Thần thoại',
    duration: 96,
    ageRating: 'NO',
    synopsis: 'Chung Quỳ bước vào hành trình trừ yêu diệt ma để bảo vệ sự bình yên của Tam Giới, đối mặt với những thế lực siêu nhiên và những trận chiến giữa các cõi.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-master_1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-master_1.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-02'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'KHÓA CHẶT CỬA NÀO SUZUME',
    slug: 'khoa-chat-cua-nao-suzume',
    genre: 'Hoạt Hình, Phiêu Lưu',
    duration: 122,
    ageRating: 'P',
    synopsis: 'Suzume tình cờ gặp một chàng trai đang tìm kiếm những cánh cửa bí ẩn. Khi phát hiện các cánh cửa liên quan đến những thảm họa đe dọa Nhật Bản, Suzume cùng anh bắt đầu hành trình đóng chúng lại.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/p/o/poster_khoa_chat_cua_nao_suzum_1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/p/o/poster_khoa_chat_cua_nao_suzum_1.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-02'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'QUYẾT CUA ANH NÀY',
    slug: 'quyet-cua-anh-nay',
    genre: 'Hài, Tình cảm',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Henry là một chàng trai tốt bụng yêu động vật nhưng mắc chứng bệnh kỳ lạ khiến mỗi sáng anh không nhớ được những gì đã xảy ra ngày hôm trước. Lucy phải làm quen với Henry từ đầu mỗi ngày, mở ra một câu chuyện tình vừa hài hước vừa cảm động.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/e/teaser-poster_1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/e/teaser-poster_1.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-02'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'ÁN MẠNG KARAOKE',
    slug: 'an-mang-karaoke',
    genre: 'Hài, Hồi hộp',
    duration: 96,
    ageRating: 'T16',
    synopsis: 'Một người hàng xóm mê karaoke bất ngờ bị sát hại trong một homestay thiền biệt lập trên núi. Chuyến hành hương của một xóm nhỏ biến thành cuộc đấu trí khi mọi người phải lần theo những manh mối để tìm ra hung thủ.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/_/n/_n_m_ng_karaoke_-_dkkkc_02.10.2026_-_kt_chu_n.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/_/n/_n_m_ng_karaoke_-_dkkkc_02.10.2026_-_kt_chu_n.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-02'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'QUỶ ĂN TẠNG 4: HỔ TINH',
    slug: 'quy-an-tang-4-ho-tinh',
    genre: 'Hài, Hành Động, Kinh Dị',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Yak và Trung sĩ Paphan tham gia nhiệm vụ tìm kiếm một tiểu đội tình báo mất tích trong khu rừng bí ẩn. Họ chạm trán Hổ Tinh – sinh vật siêu nhiên có khả năng biến hóa và săn người – rồi buộc phải hợp tác để sống sót và khám phá bí mật của khu rừng.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/y/ty4-teaser_poster-700x1000-1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/y/ty4-teaser_poster-700x1000-1.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-09'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'ÁN MẠNG XÉM HOÀN HẢO',
    slug: 'an-mang-xem-hoan-hao',
    genre: 'Hài',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Trinh, một TikToker nổi tiếng, tỉnh dậy tại phim trường với chứng mất trí nhớ và phát hiện xác của Yến. Đại, một thám tử tư, vô tình để lại dấu vân tay trên thi thể và cùng Trinh chạy trốn cảnh sát, sát thủ đồng thời phá giải bí mật phía sau vụ án.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-amxhh_.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-amxhh_.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-09'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'CHUYỆN CÔNG CHÚA KAGUYA',
    slug: 'chuyen-cong-chua-kaguya',
    genre: 'Hoạt Hình',
    duration: 137,
    ageRating: 'NO',
    synopsis: 'Phim sắp chiếu CHUYỆN CÔNG CHÚA KAGUYA, thuộc thể loại Hoạt Hình, dự kiến ra mắt trong thời gian tới.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/u/outlined_poster_the-tale-of-the-princess-kaguya.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/u/outlined_poster_the-tale-of-the-princess-kaguya.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-09'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'NGƯỜI MẸ KHÁC',
    slug: 'nguoi-me-khac',
    genre: 'Kinh Dị',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Bela, một cô bé tám tuổi đang chứng kiến hôn nhân của cha mẹ tan vỡ, phát hiện một thực thể bí ẩn xuất hiện từ tủ quần áo. Sinh vật này mang gương mặt giống hệt mẹ ruột của Bela, khiến ranh giới giữa người thân và thế lực tà ác ngày càng đáng sợ.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/t/otm_teaser_470x700.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/t/otm_teaser_470x700.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-09'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'ALWAYS LALISA',
    slug: 'always-lalisa',
    genre: 'Phim tài liệu',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Bộ phim tài liệu theo chân LISA trong một năm quan trọng khi cô tạm rời BLACKPINK để bước vào chương mới của sự nghiệp solo. Từ quá trình thực hiện album Alter Ego, diễn xuất trong The White Lotus đến Coachella, bộ phim ghi lại áp lực, lựa chọn và hành trình định hình bản thân của LISA.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-lalisa.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-lalisa.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=s6NUEu1x64I',
    releaseDate: new Date('2026-10-12'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'CHỊ CHỊ EM EM 3',
    slug: 'chi-chi-em-em-3',
    genre: 'Tâm Lý, Tình cảm',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Trong xã hội Bắc Bộ xưa đầy lễ giáo, Thị Mầu bước vào một thế giới nơi tình yêu, danh dự và những mối quan hệ chồng chéo không thể tồn tại dễ dàng. Những rung động bị che giấu cùng các bí mật riêng tạo nên một mạng lưới tình cảm đầy toan tính.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-ccee3.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-ccee3.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-16'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'NGỌN ĐỒI HOA HỒNG ANH',
    slug: 'ngon-doi-hoa-hong-anh',
    genre: 'Hoạt Hình',
    duration: 91,
    ageRating: 'NO',
    synopsis: 'Phim sắp chiếu NGỌN ĐỒI HOA HỒNG ANH, thuộc thể loại Hoạt Hình, dự kiến ra mắt trong thời gian tới.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/u/outlined_poster_from-up-on-poppy-hill.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/o/u/outlined_poster_from-up-on-poppy-hill.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-16'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'PHIM STREET FIGHTER',
    slug: 'phim-street-fighter',
    genre: 'Hành Động',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Phim sắp chiếu PHIM STREET FIGHTER, thuộc thể loại Hành Động, dự kiến ra mắt trong thời gian tới.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/s/t/stf_teasergoodguys_470x700.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/s/t/stf_teasergoodguys_470x700.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-16'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'DIGGER',
    slug: 'digger',
    genre: 'Hài, Tâm Lý',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Một người đàn ông quyền lực khởi động một kế hoạch lớn với niềm tin rằng mình có thể trở thành vị cứu tinh của nhân loại, nhưng chính thảm họa do ông gây ra lại đe dọa hủy diệt mọi thứ.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/v/n/vn_digger_vert_main_2764x4096_intl.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/v/n/vn_digger_vert_main_2764x4096_intl.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-16'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'CHUYỆN TÌNH KHAU VAI',
    slug: 'chuyen-tinh-khau-vai',
    genre: 'Tâm Lý, Tình cảm',
    duration: 116,
    ageRating: 'NO',
    synopsis: 'Câu chuyện tình lấy cảm hứng từ truyền thuyết Khau Vai, một mối tình nổi tiếng gắn với phiên chợ tình hơn một thế kỷ tuổi ở cao nguyên đá, nay được đưa từ thơ và sân khấu lên màn ảnh rộng.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/p/o/poster_chuy_n_t_nh_khau_vai_done_1_.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/p/o/poster_chuy_n_t_nh_khau_vai_done_1_.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-16'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'MẸ MÌN',
    slug: 'me-min',
    genre: 'Bí ẩn, Hồi hộp, Tâm Lý',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Mẹ Mìn là một nhân vật bí ẩn có khả năng ban phát điều ước cho con người. Tuy nhiên, mỗi điều ước đều đi kèm một điều kiện, khiến những mong muốn tưởng như tốt đẹp có thể trở thành cái giá phải trả.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/m/_/m_m_n_-_teaser_poster_-_dkkc_23102026.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/m/_/m_m_n_-_teaser_poster_-_dkkc_23102026.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-23'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'CLAYFACE',
    slug: 'clayface',
    genre: 'Hồi hộp, Kinh Dị',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Một ngôi sao Hollywood đang lên dần biến thành Clayface, một con quái vật đầy thù hận. Bộ phim khai thác sự mất mát bản sắc và nhân tính, tình yêu độc hại cùng mặt tối của tham vọng khoa học.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/v/n/vn_clay_vert_tsr_2764x4096_intl.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/v/n/vn_clay_vert_tsr_2764x4096_intl.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-23'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'TRẤN YỂM',
    slug: 'tran-yem',
    genre: 'Kinh Dị',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Sau cái chết bí ẩn của cha trong căn nhà mới xây, Ân ghi lại những hiện tượng tâm linh kỳ quái xảy ra xung quanh. Càng điều tra, anh càng phát hiện một nghi lễ cấm kỵ liên quan đến Bùa Lỗ Ban đang ẩn trong chính căn nhà.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/r/tra_n-ye_m-poster-co_ng-bo_-du_-a_n.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/r/tra_n-ye_m-poster-co_ng-bo_-du_-a_n.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-10-30'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'BÒ SỮA BAY',
    slug: 'bo-sua-bay',
    genre: 'Hài, Hành Động, Tâm Lý',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Trong một trang trại sữa đang công nghiệp hóa, Trâu được giao nhiệm vụ đánh cắp công thức sữa bí mật để cứu gia đình. Khi tiếp cận San, con gái ông chủ và cũng là người tạo ra công thức, Trâu dần nảy sinh tình cảm và phải lựa chọn giữa gia đình với người mình yêu.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/e/teaser_poster_bsb_digital_2.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/e/teaser_poster_bsb_digital_2.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-11-06'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'GODZILLA TRỪ KHÔNG',
    slug: 'godzilla-tru-khong',
    genre: 'Hành Động',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Phim sắp chiếu GODZILLA TRỪ KHÔNG, thuộc thể loại Hành Động, dự kiến ra mắt trong thời gian tới.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/e/teaser_poster_localize_godzilla_v1_1_.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/t/e/teaser_poster_localize_godzilla_v1_1_.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-11-06'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'CHÀNG MÈO MANG MŨ',
    slug: 'chang-meo-mang-mu',
    genre: 'Gia đình, Hài, Hoạt Hình, Phiêu Lưu',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'The Cat nhận nhiệm vụ giúp hai anh em đang gặp khó khăn vì phải chuyển đến một thị trấn mới tìm lại niềm vui. Chuyến phiêu lưu kỳ quặc của chú mèo mang mũ mở ra một câu chuyện gia đình hài hước và kỳ ảo.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/p/o/poster_chang_meo_mang_mu_1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/p/o/poster_chang_meo_mang_mu_1.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-11-06'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'NGÀY CON CÒN MẸ',
    slug: 'ngay-con-con-me',
    genre: 'Gia đình, Tâm Lý',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Mây lớn lên với cảm giác mình bị mẹ bỏ quên khi luôn nghĩ anh Hai Pháo mới là người được yêu thương. Một biến cố khiến Mây nhận ra cô đã dành quá nhiều năm trách mẹ mà chưa từng thật sự hiểu tình yêu của bà.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-nccm.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-nccm.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-11-11'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'EBENEZER PHÉP MÀU ĐÊM GIÁNG SINH',
    slug: 'ebenezer-phep-mau-dem-giang-sinh',
    genre: 'Thần thoại',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Phim sắp chiếu EBENEZER PHÉP MÀU ĐÊM GIÁNG SINH, thuộc thể loại Thần thoại, dự kiến ra mắt trong thời gian tới.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-ebenezer.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-ebenezer.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-11-13'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'TRẠI GIAM HẠNH PHÚC',
    slug: 'trai-giam-hanh-phuc',
    genre: 'Gia đình, Hài, Tâm Lý',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Bộ phim khai thác thế giới sau song sắt qua góc nhìn nhân văn, tập trung vào những con người sống trong môi trường nhà tù và những câu chuyện về sự thay đổi, hy vọng và tình người.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-tghp.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-tghp.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-11-20'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'GẶP GỠ THÔNG GIA: DÂU MỚI TRÌNH LÀNG',
    slug: 'gap-go-thong-gia-dau-moi-trinh-lang',
    genre: 'Hài',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Henry đưa bạn gái Olivia về ra mắt gia đình Focker. Olivia là một vận động viên ba môn phối hợp, và cuộc gặp gỡ nhanh chóng trở thành chuỗi tình huống hài hước, nhất là khi kế hoạch cầu hôn được tiết lộ.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-fil.png',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470x700-fil.png',
    trailerUrl: null,
    releaseDate: new Date('2026-11-27'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'SỢI CHỈ ĐỎ',
    slug: 'soi-chi-do',
    genre: 'Kinh Dị',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Một kẻ cuồng tín sau những cơn đau đầu dữ dội phát hiện một con mắt xuất hiện trên trán. Những vụ sát nhân hàng loạt, bóng ma và ám ảnh từ quá khứ dần kết nối với nhau, đặt câu hỏi về sợi chỉ đỏ đứng sau tất cả.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/s/o/so_i_chi_o_-_2nd_look_-_kc_04122026.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/s/o/so_i_chi_o_-_2nd_look_-_kc_04122026.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-12-04'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'DUNE: HÀNH TINH CÁT - PHẦN BA',
    slug: 'dune-ha-nh-tinh-ca-t-pha-n-ba',
    genre: 'Hành Động, Khoa Học Viễn Tưởng',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Gần hai thập kỷ sau khi Paul Atreides nắm quyền kiểm soát Đế chế, ông phải đối mặt với hậu quả của chính sự cai trị. Những đồng minh cũ, mối đe dọa mới, phản bội và cuộc nổi dậy kéo Paul vào âm mưu mà trung tâm là Chani, buộc ông phải đối diện với cái giá của quyền lực.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/v/n/vn_dune3_vert_tsr_2764x4096_intl.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/v/n/vn_dune3_vert_tsr_2764x4096_intl.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=mWjLTxrXsxk',
    releaseDate: new Date('2026-12-18'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'AVENGERS: NGÀY TẬN THẾ',
    slug: 'avengers-ngay-tan-the',
    genre: 'Hành Động, Khoa Học Viễn Tưởng, Phiêu Lưu',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Các siêu anh hùng còn lại phải hợp tác với Fantastic Four để đối mặt với Victor Von Doom, một siêu phản diện mới đe dọa toàn bộ thế giới.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/a/p/applepie_teaser2_poster_vietnam.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/a/p/applepie_teaser2_poster_vietnam.jpg',
    trailerUrl: null,
    releaseDate: new Date('2026-12-18'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'THÁM TỬ KIÊN: LỜI NGUYỀN HOÀNG KIM',
    slug: 'tham-tu-kien-loi-nguyen-hoang-kim',
    genre: 'Tâm Lý',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Phần tiếp theo của Thám Tử Kiên tiếp tục lấy cảm hứng từ tiểu thuyết Phục Gia Truyện, xoay quanh Phục Gia – một chàng trai mang trọng trách phục hưng gia tộc giữa những biến động lịch sử.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-ttk_1.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/3/5/350x495-ttk_1.jpg',
    trailerUrl: null,
    releaseDate: new Date('2027-02-06'),
    isNowShowing: false,
    isComingSoon: true,
  },
  {
    title: 'LOẠN THẾ',
    slug: 'loan-the',
    genre: 'Hành Động',
    duration: 105,
    ageRating: 'NO',
    synopsis: 'Một thời đại nghĩa hiệp sắp mở ra trong tác phẩm võ hiệp hành động do Dương Minh Chiến đạo diễn, đánh dấu lần đầu ekip bước vào đường đua phim Tết.',
    posterUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-loanthe.jpg',
    imageUrl: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/1/thumbnail/190x260/2e2b8cd282892c71872b9e67d2cb5039/4/7/470wx700h-loanthe.jpg',
    trailerUrl: null,
    releaseDate: new Date('2027-02-06'),
    isNowShowing: false,
    isComingSoon: true,
  }
];

/* =========================================================
 * CINEMAS
 * ========================================================= */

const cinemas = [
  {
    name: 'CGV Vincom Center Landmark 81',
    city: 'Hồ Chí Minh',
    address: '208 Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh',
  },
  {
    name: 'CGV VivoCity',
    city: 'Hồ Chí Minh',
    address: '1058 Nguyễn Văn Linh, Phường Tân Phong, Quận 7',
  },
  {
    name: 'CGV Gò Vấp',
    city: 'Hồ Chí Minh',
    address: '190 Quang Trung, Phường 10, Quận Gò Vấp',
  },
  {
    name: 'CGV Sư Vạn Hạnh',
    city: 'Hồ Chí Minh',
    address: 'Tầng 6 Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Quận 10',
  },
];

/* =========================================================
 * COMBOS
 * ========================================================= */

const combos = [
  {
    name: 'CGV Combo',
    description: '01 Bắp ngọt lớn + 02 Nước ngọt siêu lớn + 01 Snack',
    imageUrl: '/images/combos/cgv-combo.jpg',
    price: 135000,
    stock: 100,
  },
  {
    name: 'Toy Story Blindbox',
    description: '01 Hộp mù Toy Story + 01 Nước ngọt siêu lớn + 01 Bắp ngọt lớn',
    imageUrl: '/images/combos/toy-story-blindbox.jpg',
    price: 249000,
    stock: 50,
  },
  {
    name: 'Conan Blindbox 2026',
    description: '01 Blindbox Conan Dango Mascot + 01 Bắp ngọt + 01 Nước ngọt',
    imageUrl: '/images/combos/conan-blindbox.jpg',
    price: 229000,
    stock: 50,
  },
  {
    name: 'NCT Special Deal',
    description: '01 Ly nhân vật NCT + 01 Bắp ngọt lớn + 01 Nước ngọt siêu lớn',
    imageUrl: '/images/combos/nct-special-deal.jpg',
    price: 219000,
    stock: 50,
  },
  {
    name: 'BTS Special Offer',
    description: '01 Ly BTS + 01 Nước ngọt siêu lớn + tùy chọn thêm bắp',
    imageUrl: '/images/combos/bts-special-offer.jpg',
    price: 199000,
    stock: 50,
  },
  {
    name: 'BT21 VN Single',
    description: '01 Ly BT21 Vietnam Edition + 01 Nước ngọt siêu lớn + 01 Bắp ngọt lớn',
    imageUrl: '/images/combos/bt21-vietnam.jpg',
    price: 299000,
    stock: 50,
  },
  {
    name: 'Michael Combo',
    description: '01 Hộp bắp nón fedora Michael + 01 Nước ngọt siêu lớn + 01 Bắp ngọt lớn',
    imageUrl: '/images/combos/michael-combo.jpg',
    price: 259000,
    stock: 50,
  },
  {
    name: 'Supergirl Combo',
    description: '01 Bình nước Supergirl + 01 Bắp ngọt lớn + 01 Nước ngọt siêu lớn',
    imageUrl: '/images/combos/supergirl-combo.jpg',
    price: 239000,
    stock: 50,
  },
];

/* =========================================================
 * HELPERS
 * ========================================================= */

function createSeatCode(rowIndex: number, seatNumber: number) {
  const row = String.fromCharCode(65 + rowIndex);
  return `${row}${seatNumber}`;
}

function getSeatType(rowIndex: number) {
  if (rowIndex >= 8) return 'COUPLE';
  if (rowIndex >= 5) return 'VIP';
  return 'STANDARD';
}

/* =========================================================
 * MAIN
 * ========================================================= */

async function main() {
  console.log('==========================================');
  console.log('START CINEMA DATABASE SEED');
  console.log('==========================================');

  /* -------------------------------------------------------
   * 1. MOVIES
   * ----------------------------------------------------- */

  const nowShowingMovies = movies.filter((movie) => movie.isNowShowing);
  const comingSoonMovies = movies.filter((movie) => movie.isComingSoon);

  console.log(`\nSeeding ${movies.length} movies...`);
  console.log(`Now showing : ${nowShowingMovies.length}`);
  console.log(`Coming soon : ${comingSoonMovies.length}`);

  const movieRecords = [];

  for (const movie of movies) {
    const record = await prisma.movie.upsert({
      where: { slug: movie.slug },
      update: {
        title: movie.title,
        genre: movie.genre,
        duration: movie.duration,
        ageRating: movie.ageRating,
        synopsis: movie.synopsis,
        posterUrl: movie.posterUrl,
        imageUrl: movie.imageUrl,
        trailerUrl: movie.trailerUrl,
        releaseDate: movie.releaseDate,
        isNowShowing: movie.isNowShowing,
        isComingSoon: movie.isComingSoon,
      },
      create: movie,
    });

    movieRecords.push(record);
  }

  console.log(`✓ ${movieRecords.length} movies`);

  /* -------------------------------------------------------
   * 2. CINEMAS
   * ----------------------------------------------------- */

  console.log(`\nSeeding ${cinemas.length} cinemas...`);

  const cinemaRecords = [];

  for (const cinemaData of cinemas) {
    let cinema = await prisma.cinema.findFirst({
      where: { name: cinemaData.name },
    });

    if (!cinema) {
      cinema = await prisma.cinema.create({ data: cinemaData });
    } else {
      cinema = await prisma.cinema.update({
        where: { id: cinema.id },
        data: cinemaData,
      });
    }

    cinemaRecords.push(cinema);
  }

  console.log(`✓ ${cinemaRecords.length} cinemas`);

  /* -------------------------------------------------------
   * 3. HALLS + SEATS
   * ----------------------------------------------------- */

  console.log('\nSeeding halls and seats...');

  const hallRecords = [];

  for (const cinema of cinemaRecords) {
    for (let hallIndex = 1; hallIndex <= 3; hallIndex++) {
      const hallName = `Phòng ${hallIndex}`;

      let hall = await prisma.hall.findFirst({
        where: {
          cinemaId: cinema.id,
          name: hallName,
        },
      });

      if (!hall) {
        hall = await prisma.hall.create({
          data: {
            cinemaId: cinema.id,
            name: hallName,
            capacity: 80,
            layoutWidth: 1000,
            layoutHeight: 650,
            layoutPreset: 'STANDARD',
          },
        });
      }

      hallRecords.push(hall);

      for (let rowIndex = 0; rowIndex < 10; rowIndex++) {
        for (let seatNumber = 1; seatNumber <= 8; seatNumber++) {
          const code = createSeatCode(rowIndex, seatNumber);

          await prisma.seat.upsert({
            where: {
              hallId_code: {
                hallId: hall.id,
                code,
              },
            },
            update: {
              rowLabel: String.fromCharCode(65 + rowIndex),
              seatNumber,
              type: getSeatType(rowIndex),
              isActive: true,
              positionX: 100 + (seatNumber - 1) * 95,
              positionY: 100 + rowIndex * 50,
            },
            create: {
              hallId: hall.id,
              code,
              rowLabel: String.fromCharCode(65 + rowIndex),
              seatNumber,
              type: getSeatType(rowIndex),
              isActive: true,
              positionX: 100 + (seatNumber - 1) * 95,
              positionY: 100 + rowIndex * 50,
            },
          });
        }
      }

      const existingScreen = await prisma.hallLayoutBlock.findFirst({
        where: { hallId: hall.id, type: 'SCREEN' },
      });

      if (!existingScreen) {
        await prisma.hallLayoutBlock.create({
          data: {
            hallId: hall.id,
            type: 'SCREEN',
            x: 100,
            y: 20,
            width: 760,
            height: 40,
            label: 'MÀN HÌNH',
          },
        });
      }

      const existingAisle = await prisma.hallLayoutBlock.findFirst({
        where: { hallId: hall.id, type: 'AISLE' },
      });

      if (!existingAisle) {
        await prisma.hallLayoutBlock.create({
          data: {
            hallId: hall.id,
            type: 'AISLE',
            x: 455,
            y: 100,
            width: 50,
            height: 500,
            label: 'LỐI ĐI',
          },
        });
      }
    }
  }

  console.log(`✓ ${hallRecords.length} halls`);
  console.log(`✓ ${hallRecords.length * 80} seats`);

  /* -------------------------------------------------------
   * 4. SHOWTIMES
   * ----------------------------------------------------- */

  console.log('\nSeeding showtimes...');

  const showtimeHours = [
    { hour: 9, minute: 0 },
    { hour: 12, minute: 30 },
    { hour: 16, minute: 0 },
    { hour: 19, minute: 30 },
  ];

  let showtimeCount = 0;
  const now = new Date();

  // Chỉ tạo suất chiếu cho phim đang chiếu.
  // Phim sắp chiếu vẫn xuất hiện trong danh sách phim nhưng chưa có suất.
  const showtimeMovies = movieRecords.filter((movie) => movie.isNowShowing);

  for (const hall of hallRecords) {
    const hallIndex = hallRecords.findIndex((item) => item.id === hall.id);

    for (let day = 0; day < 7; day++) {
      for (let slot = 0; slot < showtimeHours.length; slot++) {
        if (showtimeMovies.length === 0) continue;

        const movieIndex =
          (hallIndex * 4 + day + slot) % showtimeMovies.length;

        const movie = showtimeMovies[movieIndex];

        const startTime = new Date(now);
        startTime.setDate(now.getDate() + day);
        startTime.setHours(
          showtimeHours[slot].hour,
          showtimeHours[slot].minute,
          0,
          0,
        );

        const existing = await prisma.showtime.findFirst({
          where: {
            hallId: hall.id,
            movieId: movie.id,
            startTime,
          },
        });

        if (existing) continue;

        const endTime = new Date(
          startTime.getTime() + movie.duration * 60 * 1000,
        );

        await prisma.showtime.create({
          data: {
            movieId: movie.id,
            hallId: hall.id,
            startTime,
            endTime,
            language: 'VietSub',
            format: '2D',
            standardPrice: 85000,
            vipPrice: 100000,
            couplePrice: 160000,
          },
        });

        showtimeCount++;
      }
    }
  }

  console.log(`✓ ${showtimeCount} showtimes`);

  /* -------------------------------------------------------
   * 5. COMBOS
   * ----------------------------------------------------- */

  console.log(`\nSeeding ${combos.length} combos...`);

  for (const combo of combos) {
    const existing = await prisma.combo.findFirst({
      where: { name: combo.name },
    });

    if (existing) {
      await prisma.combo.update({
        where: { id: existing.id },
        data: {
          description: combo.description,
          imageUrl: combo.imageUrl,
          price: combo.price,
          stock: combo.stock,
          isActive: true,
        },
      });
    } else {
      await prisma.combo.create({
        data: { ...combo, isActive: true },
      });
    }
  }

  console.log(`✓ ${combos.length} combos`);

  /* -------------------------------------------------------
   * 6. VOUCHERS
   * ----------------------------------------------------- */

  console.log('\nSeeding vouchers...');

  const voucherData = [
    {
      code: 'WELCOME20',
      discountType: 'PERCENT',
      discountValue: 20,
      minOrderAmount: 100000,
      usageLimit: 1000,
      perUserLimit: 1,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2027-12-31'),
    },
    {
      code: 'MOVIE50K',
      discountType: 'FIXED',
      discountValue: 50000,
      minOrderAmount: 200000,
      usageLimit: 500,
      perUserLimit: 2,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2027-12-31'),
    },
    {
      code: 'CINEMA10',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderAmount: 150000,
      usageLimit: 1000,
      perUserLimit: 3,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2027-12-31'),
    },
  ];

  for (const voucher of voucherData) {
    await prisma.voucher.upsert({
      where: { code: voucher.code },
      update: { ...voucher, isActive: true },
      create: { ...voucher, isActive: true },
    });
  }

  console.log(`✓ ${voucherData.length} vouchers`);

  /* -------------------------------------------------------
   * SUMMARY
   * ----------------------------------------------------- */

  const movieCount = await prisma.movie.count();
  const nowShowingCount = await prisma.movie.count({
    where: { isNowShowing: true },
  });
  const comingSoonCount = await prisma.movie.count({
    where: { isComingSoon: true },
  });
  const cinemaCount = await prisma.cinema.count();
  const hallCount = await prisma.hall.count();
  const seatCount = await prisma.seat.count();
  const showtimeCountTotal = await prisma.showtime.count();
  const comboCount = await prisma.combo.count();
  const voucherCount = await prisma.voucher.count();

  console.log('\n==========================================');
  console.log('SEED COMPLETED');
  console.log('==========================================');
  console.log(`Movies        : ${movieCount}`);
  console.log(`Now Showing   : ${nowShowingCount}`);
  console.log(`Coming Soon   : ${comingSoonCount}`);
  console.log(`Cinemas       : ${cinemaCount}`);
  console.log(`Halls         : ${hallCount}`);
  console.log(`Seats         : ${seatCount}`);
  console.log(`Showtimes     : ${showtimeCountTotal}`);
  console.log(`Combos        : ${comboCount}`);
  console.log(`Vouchers      : ${voucherCount}`);
  console.log('==========================================');
}

main()
  .catch((error) => {
    console.error('\nSeed failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });