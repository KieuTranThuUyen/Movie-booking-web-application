'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';

type Comment = {
  id: string;
  userId: string;
  parentId: string | null;
  content: string;
  rating: number | null;
  imageUrls: string[];
  isHidden: boolean;
  createdAt: string;
  user: { id: string; name: string; role: 'CUSTOMER' | 'ADMIN' };
};

type Props = { movieId: string };

function Stars({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div className="flex gap-1" aria-label="Chọn số sao">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange?.(star)} className={`text-2xl ${star <= value ? 'text-amber-300' : 'text-slate-600'}`} aria-label={`${star} sao`}>
          ★
        </button>
      ))}
    </div>
  );
}

export function MovieComments({ movieId }: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [comments, setComments] = useState<Comment[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadComments() {
    const response = await fetch(`/api/movies/${movieId}/comments${isAdmin ? '?admin=true' : ''}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json() as { comments: Comment[]; summary: { average: number; count: number } };
    setComments(data.comments);
    setAverage(data.summary.average);
    setCount(data.summary.count);
  }

  useEffect(() => { void loadComments(); }, [movieId, isAdmin]);

  function startEdit(comment: Comment) {
    setEditing(comment);
    setReplyTo(null);
    setContent(comment.content);
    setRating(comment.rating ?? 0);
    clearSelectedImages();
    setRemovedImageUrls([]);
    setMessage('');
  }

  function resetForm() {
    setEditing(null);
    setReplyTo(null);
    setContent('');
    setRating(0);
    clearSelectedImages();
    setRemovedImageUrls([]);
  }

  function beginReply(commentId: string) {
    setReplyTo(commentId);
    setEditing(null);
    setContent('');
    setRating(0);
    clearSelectedImages();
    setRemovedImageUrls([]);
    setMessage('');
  }

  function clearSelectedImages() {
    imagePreviewUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
    setImageFiles([]);
    setImagePreviewUrls([]);
  }

  function selectImages(files: File[]) {
    imagePreviewUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
    setImageFiles(files);
    setImagePreviewUrls(files.map((file) => URL.createObjectURL(file)));
  }

  function removeSelectedImage(index: number) {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setImagePreviewUrls((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  function renderImagePreviews() {
    if (imagePreviewUrls.length === 0) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-3">
        {imagePreviewUrls.map((imageUrl, index) => (
          <span key={imageUrl} className="relative block size-24 overflow-hidden rounded-xl border border-sky-400/30">
            <img src={imageUrl} alt="Tệp đang chọn" className="size-full object-cover" />
            <button type="button" onClick={() => removeSelectedImage(index)} className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-950/80 text-lg leading-none text-white" aria-label="Xóa tệp đang chọn">×</button>
          </span>
        ))}
      </div>
    );
  }

  function renderSavedImagePreviews(comment: Comment) {
    const visibleImages = comment.imageUrls.filter((imageUrl) => !removedImageUrls.includes(imageUrl));
    if (visibleImages.length === 0) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-3">
        {visibleImages.map((imageUrl) => (
          <span key={imageUrl} className="relative block size-24 overflow-hidden rounded-xl border border-white/10">
            <img src={imageUrl} alt="Tệp đính kèm" className="size-full object-cover" />
            <button type="button" onClick={() => setRemovedImageUrls((current) => [...current, imageUrl])} className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-950/80 text-lg leading-none text-white" aria-label="Xóa tệp đính kèm">×</button>
          </span>
        ))}
      </div>
    );
  }

  function renderInlineEditor(comment: Comment): ReactNode {
    if (editing?.id !== comment.id || !session?.user) return null;
    return (
      <form onSubmit={submit} className="mt-4">
        <Stars value={rating} onChange={setRating} />
        <textarea autoFocus value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} required rows={4} className="mt-3 w-full rounded-xl border border-sky-400/40 bg-slate-950/60 p-3 text-white outline-none focus:border-sky-400" />
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImages(Array.from(event.target.files ?? []))} className="mt-3 block text-sm text-slate-300" />
        {renderSavedImagePreviews(comment)}
        {renderImagePreviews()}
        {message && <p className="mt-2 text-sm text-rose-300">{message}</p>}
        <div className="mt-3 flex gap-3">
          <button disabled={loading} className="rounded-xl bg-sky-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          <button type="button" onClick={resetForm} className="rounded-xl border border-white/15 px-4 py-2 text-slate-200">Hủy</button>
        </div>
      </form>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData();
    form.set('content', content);
    if (rating) form.set('rating', String(rating));
    if (replyTo) form.set('parentId', replyTo);
    imageFiles.forEach((file) => form.append('image', file));
    if (editing) form.set('removedImages', JSON.stringify(removedImageUrls));
    const endpoint = editing ? `/api/movies/${movieId}/comments/${editing.id}` : `/api/movies/${movieId}/comments`;
    const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', body: form });
    const data = await response.json() as { message?: string };
    setLoading(false);
    if (!response.ok) { setMessage(data.message ?? 'Không thể lưu bình luận.'); return; }
    resetForm();
    await loadComments();
  }

  async function remove(comment: Comment) {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này không?')) return;
    const response = await fetch(`/api/movies/${movieId}/comments/${comment.id}`, { method: 'DELETE' });
    if (response.ok) await loadComments();
  }

  async function toggleHidden(comment: Comment) {
    const response = await fetch(`/api/admin/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHidden: !comment.isHidden }),
    });
    if (response.ok) await loadComments();
  }

  const roots = comments.filter((comment) => !comment.parentId);
  const replies = (id: string) => comments.filter((comment) => comment.parentId === id);

  function renderReplyForm(commentId: string): ReactNode {
    if (replyTo !== commentId || !session?.user) return null;
    return (
      <form onSubmit={submit} className="mt-3 rounded-xl border border-sky-400/20 bg-slate-950/40 p-4">
        <p className="text-sm font-semibold text-white">Trả lời bình luận này</p>
        <Stars value={rating} onChange={setRating} />
        <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} required rows={3} placeholder="Viết câu trả lời..." className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-white outline-none focus:border-sky-400" />
        {message && <p className="mt-2 text-sm text-rose-300">{message}</p>}
        <div className="mt-3 flex gap-3">
          <button disabled={loading} className="rounded-xl bg-sky-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{loading ? 'Đang gửi...' : 'Gửi trả lời'}</button>
          <button type="button" onClick={resetForm} className="rounded-xl border border-white/15 px-4 py-2 text-slate-200">Hủy</button>
        </div>
      </form>
    );
  }

  function renderReplies(parentId: string, depth = 0): ReactNode {
    const nestedReplies = replies(parentId);
    if (nestedReplies.length === 0) return null;
    return (
      <div className={`${depth === 0 ? 'mt-5 border-l border-sky-400/20 pl-4' : 'mt-3 border-l border-white/10 pl-4'} space-y-3`}>
        {nestedReplies.map((reply) => (
          <div key={reply.id} className={`rounded-xl p-4 ${reply.isHidden ? 'bg-rose-400/10' : 'bg-black/20'}`}>
            <strong className="text-white">{reply.user.name}</strong>
            {reply.user.role === 'ADMIN' && <span className="ml-2 text-xs text-sky-200">Phản hồi từ Admin</span>}
            {reply.isHidden && <span className="ml-2 text-xs text-rose-200">Đang ẩn</span>}
            {reply.rating && <Stars value={reply.rating} />}
            {editing?.id === reply.id ? renderInlineEditor(reply) : <p className="mt-2 whitespace-pre-wrap text-slate-300">{reply.content}</p>}
            <p className="mt-2 text-xs text-slate-500">{new Date(reply.createdAt).toLocaleString('vi-VN')}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <button type="button" onClick={() => beginReply(reply.id)} className="text-sky-300">Trả lời</button>
              {session?.user?.id === reply.userId && editing?.id !== reply.id && <><button type="button" onClick={() => startEdit(reply)} className="text-slate-300">Sửa</button><button type="button" onClick={() => remove(reply)} className="text-rose-300">Xóa</button></>}
              {isAdmin && <button type="button" onClick={() => toggleHidden(reply)} className="text-amber-200">{reply.isHidden ? 'Hiện lại' : 'Ẩn bình luận'}</button>}
            </div>
            {renderReplyForm(reply.id)}
            {renderReplies(reply.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="mt-12 border-t border-white/10 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">Bình luận & đánh giá</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Đánh giá từ người xem</h2>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-right">
          <div className="text-2xl font-bold text-amber-200">{average ? average.toFixed(1) : '—'} / 5</div>
          <div className="text-sm text-slate-300">{count} lượt đánh giá</div>
        </div>
      </div>

      {session?.user && !editing && !replyTo ? (
        <form onSubmit={submit} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="font-semibold text-white">Chia sẻ cảm nhận</label>
            <Stars value={rating} onChange={setRating} />
          </div>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} required rows={4} placeholder="Viết nhận xét của bạn..." className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-white outline-none focus:border-sky-400" />
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImages(Array.from(event.target.files ?? []))} className="mt-3 block text-sm text-slate-300" />
          {renderImagePreviews()}
          {message && <p className="mt-2 text-sm text-rose-300">{message}</p>}
          <div className="mt-4 flex gap-3">
            <button disabled={loading} className="rounded-xl bg-sky-400 px-5 py-2.5 font-bold text-slate-950 disabled:opacity-50">{loading ? 'Đang gửi...' : 'Đăng bình luận'}</button>
          </div>
        </form>
      ) : <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">Vui lòng đăng nhập để bình luận và đánh giá phim.</p>}

      <div className="mt-8 space-y-5">
        {roots.length === 0 && <p className="text-slate-400">Chưa có bình luận nào.</p>}
        {roots.map((comment) => <article key={comment.id} className={`rounded-2xl border p-5 ${comment.isHidden ? 'border-rose-400/30 bg-rose-400/5' : 'border-white/10 bg-white/[0.03]'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><strong className="text-white">{comment.user.name}</strong>{comment.user.role === 'ADMIN' && <span className="ml-2 rounded-full bg-sky-400/15 px-2 py-1 text-xs text-sky-200">Quản trị viên</span>}{comment.isHidden && <span className="ml-2 rounded-full bg-rose-400/15 px-2 py-1 text-xs text-rose-200">Đang ẩn</span>}<p className="mt-1 text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString('vi-VN')}</p></div>
            {comment.rating && <Stars value={comment.rating} />}
          </div>
          {editing?.id === comment.id ? renderInlineEditor(comment) : <p className="mt-4 whitespace-pre-wrap text-slate-200">{comment.content}</p>}
          {editing?.id !== comment.id && comment.imageUrls.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{comment.imageUrls.map((imageUrl) => <img key={imageUrl} src={imageUrl} alt="Tệp đính kèm bình luận" className="max-h-64 max-w-full rounded-xl object-cover" />)}</div>}
          <div className="mt-4 flex flex-wrap gap-3 text-sm"><button type="button" onClick={() => beginReply(comment.id)} className="text-sky-300">Trả lời</button>{session?.user?.id === comment.userId && editing?.id !== comment.id && <><button type="button" onClick={() => startEdit(comment)} className="text-slate-300">Sửa</button><button type="button" onClick={() => remove(comment)} className="text-rose-300">Xóa</button></>}{isAdmin && <button type="button" onClick={() => toggleHidden(comment)} className="text-amber-200">{comment.isHidden ? 'Hiện lại' : 'Ẩn bình luận'}</button>}</div>
          {renderReplyForm(comment.id)}
          {renderReplies(comment.id)}
        </article>)}
      </div>
    </section>
  );
}
