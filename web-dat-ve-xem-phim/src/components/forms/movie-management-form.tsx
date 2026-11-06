'use client';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
type MovieItem = {
    id: string;
    title: string;
    slug: string;
    genre: string;
    duration: number;
    ageRating: string;
    synopsis: string;
    posterUrl: string;
    imageUrl: string;
    trailerUrl: string | null;
    releaseDate: string | Date;
    isNowShowing: boolean;
    isComingSoon: boolean;
};
type MovieManagementFormProps = {
    movies: MovieItem[];
};

function toDateTimeInputValue(value: string | Date | null | undefined): string {
    if (!value)
        return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return '';
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}
const emptyForm = {
    title: '',
    slug: '',
    genre: '',
    duration: 120,
    ageRating: 'T13',
    synopsis: '',
    posterUrl: '',
    imageUrl: '',
    trailerUrl: '',
    releaseDate: '',
};
export function MovieManagementForm({ movies, }: MovieManagementFormProps) {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    
    
    const [editingMovieId, setEditingMovieId] = useState('');
    
    const [form, setForm] = useState(emptyForm);
    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);
    const upcomingMovies = useMemo(() => movies
        .filter((movie) => new Date(movie.releaseDate).getTime() > currentTime)
        .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()), [currentTime, movies]);
    const nowShowingMovies = useMemo(() => movies
        .filter((movie) => new Date(movie.releaseDate).getTime() <= currentTime)
        .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()), [currentTime, movies]);
    const [activeTab, setActiveTab] = useState<'coming' | 'now'>('coming');
    const visibleMovies = activeTab === 'coming' ? upcomingMovies : nowShowingMovies;
    const selectedMovie = useMemo(() => movies.find((movie) => movie.id === editingMovieId), [editingMovieId, movies]);
    
    
    
    const handleCreateNew = () => {
        setEditingMovieId('');
        setForm(emptyForm);
        setMessage('');
    };
    
    
    
    const syncSelectedMovie = (movieId: string) => {
        const movie = movies.find((item) => item.id === movieId);
        if (!movie) {
            handleCreateNew();
            return;
        }
        setEditingMovieId(movie.id);
        setForm({
            title: movie.title,
            slug: movie.slug,
            genre: movie.genre,
            duration: movie.duration,
            ageRating: movie.ageRating,
            synopsis: movie.synopsis,
            posterUrl: movie.posterUrl,
            imageUrl: movie.imageUrl,
            trailerUrl: movie.trailerUrl ?? '',
            releaseDate: toDateTimeInputValue(movie.releaseDate),
        });
        setMessage('');
    };
    
    
    
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch(editingMovieId
                ? `/api/admin/movies/${editingMovieId}`
                : '/api/admin/movies', {
                method: editingMovieId ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });
            const data = (await response.json()) as {
                message: string;
                movie?: MovieItem;
            };
            if (!response.ok) {
                setMessage(data.message || 'Có lỗi xảy ra.');
                return;
            }
            setMessage(data.message);
            
            if (data.movie) {
                setEditingMovieId(data.movie.id);
                setForm({
                    title: data.movie.title,
                    slug: data.movie.slug,
                    genre: data.movie.genre,
                    duration: data.movie.duration,
                    ageRating: data.movie.ageRating,
                    synopsis: data.movie.synopsis,
                    posterUrl: data.movie.posterUrl,
                    imageUrl: data.movie.imageUrl,
                    trailerUrl: data.movie.trailerUrl ?? '',
                    releaseDate: toDateTimeInputValue(data.movie.releaseDate) || form.releaseDate,
                });
            }
        }
        catch {
            setMessage('Không thể kết nối đến máy chủ.');
        }
        finally {
            setLoading(false);
        }
    };
    
    
    
    const handleDelete = async () => {
        if (!editingMovieId) {
            return;
        }
        const confirmed = window.confirm('Bạn có chắc muốn xóa phim này không?');
        if (!confirmed) {
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch(`/api/admin/movies/${editingMovieId}`, {
                method: 'DELETE',
            });
            const data = (await response.json()) as {
                message: string;
            };
            if (!response.ok) {
                setMessage(data.message || 'Không thể xóa phim.');
                return;
            }
            setMessage(data.message);
            
            setEditingMovieId('');
            setForm(emptyForm);
        }
        catch {
            setMessage('Không thể kết nối đến máy chủ.');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      {

}
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Danh sách phim hiện có
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              {movies.length} phim
            </p>
          </div>

          {}
          <button type="button" onClick={handleCreateNew} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
            + Tạo phim
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setActiveTab('coming')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === 'coming' ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-300'}`}>
            Sắp chiếu ({upcomingMovies.length})
          </button>
          <button type="button" onClick={() => setActiveTab('now')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === 'now' ? 'bg-emerald-400 text-slate-950' : 'bg-white/5 text-slate-300'}`}>
            Đang chiếu ({nowShowingMovies.length})
          </button>
        </div>
        <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto pr-1">
          {visibleMovies.length === 0 ? (<div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center">
              <p className="text-sm text-slate-400">
                Chưa có phim nào.
              </p>

              <button type="button" onClick={handleCreateNew} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                + Tạo phim đầu tiên
              </button>
            </div>) : (visibleMovies.map((movie) => (<button key={movie.id} type="button" onClick={() => syncSelectedMovie(movie.id)} className={`block w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${movie.id === editingMovieId
                ? 'border-sky-400/60 bg-sky-500/15 text-white'
                : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20'}`}>
                <div className="font-semibold text-white">
                  {movie.title}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {movie.slug}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] ${new Date(movie.releaseDate).getTime() <= currentTime ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                    {new Date(movie.releaseDate).getTime() <= currentTime ? 'Đang chiếu' : 'Sắp chiếu'}
                  </span>
                </div>
              </button>)))}
        </div>
      </div>

      {

}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-semibold text-white">
            {editingMovieId
            ? 'Chỉnh sửa phim'
            : 'Tạo phim mới'}
          </h3>

          <p className="mt-2 text-sm text-slate-300">
            {editingMovieId
            ? 'Cập nhật thông tin phim đang chọn.'
            : 'Nhập thông tin để tạo phim mới.'}
          </p>
        </div>

        {}
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.title} onChange={(event) => setForm((current) => ({
            ...current,
            title: event.target.value,
        }))} placeholder="Tên phim" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400" required/>

          <input value={form.slug} onChange={(event) => setForm((current) => ({
            ...current,
            slug: event.target.value,
        }))} placeholder="Slug, ví dụ: vu-dieu-rap-chieu" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400" required/>
        </div>

        {}
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.genre} onChange={(event) => setForm((current) => ({
            ...current,
            genre: event.target.value,
        }))} placeholder="Thể loại" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400" required/>

          <input type="number" min={1} value={form.duration} onChange={(event) => setForm((current) => ({
            ...current,
            duration: Number(event.target.value),
        }))} placeholder="Thời lượng (phút)" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400" required/>
        </div>

        {}
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={form.ageRating} onChange={(event) => setForm((current) => ({
            ...current,
            ageRating: event.target.value,
        }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400" required>
            <option value="P" className="bg-slate-950">
              P - Phổ biến
            </option>

            <option value="K" className="bg-slate-950">
              K
            </option>

            <option value="T13" className="bg-slate-950">
              T13
            </option>

            <option value="T16" className="bg-slate-950">
              T16
            </option>

            <option value="T18" className="bg-slate-950">
              T18
            </option>
          </select>

          <input type="datetime-local" value={form.releaseDate} onChange={(event) => setForm((current) => ({
            ...current,
            releaseDate: event.target.value,
        }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400" required/>
        </div>

        {}
        <input value={form.posterUrl} onChange={(event) => setForm((current) => ({
            ...current,
            posterUrl: event.target.value,
        }))} placeholder="Poster URL (banner) - không bắt buộc" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"/>

        {}
        <input value={form.imageUrl} onChange={(event) => setForm((current) => ({
            ...current,
            imageUrl: event.target.value,
        }))} placeholder="Ảnh phim URL (dùng cho danh sách/chi tiết/lịch chiếu)" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400" required/>

        {}
        <input value={form.trailerUrl} onChange={(event) => setForm((current) => ({
            ...current,
            trailerUrl: event.target.value,
        }))} placeholder="Trailer URL - không bắt buộc" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"/>

        {}
        <textarea value={form.synopsis} onChange={(event) => setForm((current) => ({
            ...current,
            synopsis: event.target.value,
        }))} rows={5} placeholder="Mô tả phim" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400" required/>

        {}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60">
            {loading
            ? 'Đang lưu...'
            : editingMovieId
                ? 'Cập nhật phim'
                : 'Tạo phim'}
          </button>

          {}
          {editingMovieId && (<button type="button" onClick={handleCreateNew} disabled={loading} className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-50">
              Tạo phim mới
            </button>)}

          {}
          <button type="button" onClick={handleDelete} disabled={loading || !editingMovieId} className="rounded-2xl border border-rose-400/40 px-5 py-3 font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-50">
            Xóa phim
          </button>
        </div>

        {}
        {message ? (<p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>) : null}

        {}
        {selectedMovie ? (<p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Đang chọn: {selectedMovie.title}
          </p>) : (<p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Đang ở chế độ tạo phim mới
          </p>)}
      </form>
    </div>);
}
