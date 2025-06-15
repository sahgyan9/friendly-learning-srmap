
interface PopularTagsProps {
  onTagClick: (tag: string) => void;
}

const PopularTags = ({ onTagClick }: PopularTagsProps) => {
  const tags = ["Python", "Data Structures", "Machine Learning", "Web Development"];

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm text-muted-foreground">Popular:</span>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTagClick(tag)}
          className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        >
          {tag}
        </button>
      ))}
    </div>
  );
};

export default PopularTags;
