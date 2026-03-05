import { ExploreExperience } from "@/components/viewer/ExploreExperience";

interface ExplorePageProps {
  searchParams?: {
    scene?: string;
  };
}

export default function ExplorePage({ searchParams }: ExplorePageProps) {
  return <ExploreExperience initialSceneId={searchParams?.scene ?? null} />;
}
