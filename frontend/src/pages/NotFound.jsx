import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-app grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-6xl font-extrabold text-brand-600">404</p>
        <h1 className="mt-2 text-xl font-bold">Page not found</h1>
        <p className="mt-1 text-sm text-slate-500">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
        <Link to="/" className="btn-primary mt-6">Back to home</Link>
      </div>
    </div>
  );
}
