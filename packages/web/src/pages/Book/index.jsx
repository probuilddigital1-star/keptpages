import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import BookDesigner from '@/components/book/BookDesigner';

export default function BookPage() {
  const { id: collectionId } = useParams();
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get('bookId') || 'new';

  return <BookDesigner collectionId={collectionId} bookId={bookId} />;
}
