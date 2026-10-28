import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react';
import api from '../api/client';
import { imageUrl } from '../utils/imageUrl';

const categories = ['bicycles', 'calculators', 'books', 'electronics', 'stationery', 'hostel essentials', 'other'];
const conditions = ['new', 'like new', 'good', 'fair', 'needs repair'];
const localInputTime = (date) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};
const initialValues = () => {
  const now = new Date();
  const start = new Date(now.getTime() + 30 * 60000);
  const end = new Date(now.getTime() + 7 * 86400000);
  return { title: '', category: 'bicycles', description: '', condition: 'good', startingPrice: '', minimumBidIncrement: 25, startTime: localInputTime(start), endTime: localInputTime(end) };
};
export default function CreateAuctionPage() {
  const navigate = useNavigate(); const [searchParams] = useSearchParams();
  const [values, setValues] = useState(initialValues);
  const [retainedImages, setRetainedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const previewUrls = useRef(new Set());
  const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false); const [prefillLoading, setPrefillLoading] = useState(false);
  const relistId = searchParams.get('relist');
  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  useEffect(() => {
    if (!relistId) return;
    let active = true;
    setPrefillLoading(true);
    api.get(`/auctions/${relistId}`).then(({ data }) => {
      if (!active) return;
      const source = data.auction;
      setValues((current) => ({ ...current, title: source.title || '', category: source.category || current.category, description: source.description || '', condition: source.condition || current.condition, startingPrice: source.startingPrice || '', minimumBidIncrement: source.minimumBidIncrement || 25 }));
      setRetainedImages((source.images || []).filter((url) => typeof url === 'string' && url.startsWith('/uploads/')));
    }).catch((e) => active && setError(e.response?.data?.message || 'Could not load the listing to relist.')).finally(() => active && setPrefillLoading(false));
    return () => { active = false; };
  }, [relistId]);

  const addImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setError('');
    if (files.some((file) => !file.type.startsWith('image/'))) { setError('Choose image files only.'); return; }
    if (retainedImages.length + selectedFiles.length + files.length > 6) { setError('Add up to six images.'); return; }
    if (files.some((file) => file.size > 2 * 1024 * 1024)) { setError('Each image must be 2 MB or smaller.'); return; }
    const storedSize = selectedFiles.reduce((total, item) => total + item.file.size, 0);
    if (storedSize + files.reduce((total, file) => total + file.size, 0) > 5 * 1024 * 1024) { setError('Keep the combined image size under 5 MB.'); return; }
    setSelectedFiles((current) => [...current, ...files.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { file, preview, id: `${file.name}-${file.lastModified}-${preview}` };
    })]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setSuccess('');
    const start = new Date(values.startTime); const end = new Date(values.endTime);
    if (!Number.isFinite(start.getTime()) || start <= new Date()) { setLoading(false); setError('Choose a start time in the future.'); return; }
    if (!Number.isFinite(end.getTime()) || end <= start) { setLoading(false); setError('The end time must be later than the start time.'); return; }
    if (Number(values.startingPrice) <= 0 || Number(values.minimumBidIncrement) <= 0) { setLoading(false); setError('Starting price and bid increment must be positive.'); return; }
    try {
      const payload = new FormData();
      payload.append('title', values.title);
      payload.append('category', values.category);
      payload.append('description', values.description);
      payload.append('condition', values.condition);
      payload.append('startingPrice', String(Number(values.startingPrice)));
      payload.append('minimumBidIncrement', String(Number(values.minimumBidIncrement)));
      payload.append('startTime', start.toISOString());
      payload.append('endTime', end.toISOString());
      payload.append('imageUrls', JSON.stringify(retainedImages));
      selectedFiles.forEach(({ file }) => payload.append('images', file));
      const { data } = await api.post('/auctions', payload);
      setSuccess('Your listing is live and ready for campus buyers.');
      if (data.auction?._id) navigate(`/auction/${data.auction._id}`, { state: { created: true } });
      else navigate('/seller/my-listings');
    } catch (e) { setError(e.response?.data?.message || 'Unable to create listing. Please check the details and try again.'); }
    finally { setLoading(false); }
  };

  return <div className="mx-auto max-w-3xl"><div className="create-panel">
    <Link to="/seller/my-listings" className="back-link"><ArrowLeft size={16} /> Back to my listings</Link>
    <p className="eyebrow mt-6 text-campus-700">{relistId ? 'GIVE IT ANOTHER CHAPTER' : 'GIVE IT ANOTHER CHAPTER'}</p>
    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{relistId ? 'Relist a campus item.' : 'List a campus item.'}</h1>
    <p className="mt-2 text-slate-600">Thoughtful details and clear photos help the right buyer find it.</p>
    {prefillLoading && <p role="status" className="mt-4 text-sm text-slate-600">Loading listing details…</p>}
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div><label className="form-label" htmlFor="listing-title">Listing title</label><input id="listing-title" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} className="form-input" maxLength={120} required /></div>
      <div className="grid gap-5 md:grid-cols-2"><div><label className="form-label" htmlFor="listing-category">Category</label><select id="listing-category" value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value })} className="form-input">{categories.map((option) => <option key={option}>{option}</option>)}</select></div><div><label className="form-label" htmlFor="listing-condition">Condition</label><select id="listing-condition" value={values.condition} onChange={(e) => setValues({ ...values, condition: e.target.value })} className="form-input">{conditions.map((option) => <option key={option}>{option}</option>)}</select></div></div>
      <div><label className="form-label" htmlFor="listing-description">Description</label><textarea id="listing-description" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} className="form-input min-h-[140px]" maxLength={4000} required /></div>
      <div><label className="form-label" htmlFor="listing-images">Photos <span className="font-normal text-slate-500">(up to 6, 2 MB each)</span></label><div className="flex flex-wrap gap-3">{retainedImages.map((image, index) => <figure key={`retained-${image}`} className="relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200"><img src={imageUrl(image)} alt={`Retained listing photo ${index + 1}`} className="h-full w-full object-cover" /><button type="button" className="absolute right-1 top-1 rounded-full bg-white p-1 text-rose-700 shadow" aria-label={`Remove retained image ${index + 1}`} onClick={() => setRetainedImages((current) => current.filter((url) => url !== image))}><Trash2 size={14} /></button></figure>)}{selectedFiles.map((item, index) => <figure key={item.id} className="relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200"><img src={item.preview} alt={`New listing photo ${index + 1}`} className="h-full w-full object-cover" /><button type="button" className="absolute right-1 top-1 rounded-full bg-white p-1 text-rose-700 shadow" aria-label={`Remove new image ${index + 1}`} onClick={() => { URL.revokeObjectURL(item.preview); previewUrls.current.delete(item.preview); setSelectedFiles((current) => current.filter((file) => file.id !== item.id)); }}><Trash2 size={14} /></button></figure>)}<label htmlFor="listing-images" className="grid h-24 w-24 cursor-pointer place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-campus-700 hover:bg-emerald-50"><ImagePlus size={22} /><span className="sr-only">Upload images</span><input id="listing-images" type="file" accept="image/*" multiple className="sr-only" onChange={addImages} /></label></div></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="form-label" htmlFor="starting-price">Starting price (INR)</label><input id="starting-price" type="number" min="1" step="1" value={values.startingPrice} onChange={(e) => setValues({ ...values, startingPrice: e.target.value })} className="form-input" required /></div><div><label className="form-label" htmlFor="bid-increment">Minimum bid increment (INR)</label><input id="bid-increment" type="number" min="1" step="1" value={values.minimumBidIncrement} onChange={(e) => setValues({ ...values, minimumBidIncrement: e.target.value })} className="form-input" required /></div></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="form-label" htmlFor="start-time">Auction starts</label><input id="start-time" type="datetime-local" value={values.startTime} onChange={(e) => setValues({ ...values, startTime: e.target.value })} className="form-input" required /></div><div><label className="form-label" htmlFor="end-time">Auction ends</label><input id="end-time" type="datetime-local" value={values.endTime} onChange={(e) => setValues({ ...values, endTime: e.target.value })} className="form-input" required /></div></div>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}{success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{success}</p>}
      <button type="submit" disabled={loading || prefillLoading} className="primary-btn w-full">{loading ? 'Publishing listing…' : 'Publish my listing'} {!loading && <ArrowRight size={17} className="ml-2" />}</button>
    </form>
  </div></div>;
}
