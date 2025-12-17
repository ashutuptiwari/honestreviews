import { useEffect, useRef } from 'react';

interface Props {
  onVisible: () => void;
  disabled?: boolean;
}

const InfiniteScrollTrigger: React.FC<Props> = ({
  onVisible,
  disabled = false,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          onVisible();
        }
      },
      { rootMargin: '200px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onVisible, disabled]);

  return <div ref={ref} />;
};

export default InfiniteScrollTrigger;
