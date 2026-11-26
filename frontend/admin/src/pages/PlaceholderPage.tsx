import PageHeader from "../components/ui/PageHeader";
import ComingSoon from "../components/ui/ComingSoon";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <ComingSoon label={title} />
    </>
  );
}
