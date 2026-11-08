import type { Metadata } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import PullRefresh from '@/components/PullRefresh';
export const metadata: Metadata = { title: 'WAYSS — Connect · Create · Explore', description: 'A space to connect, create and explore.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}<PullRefresh/></body></html>; }