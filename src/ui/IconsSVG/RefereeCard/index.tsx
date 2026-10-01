type RefereeCardType = "yellow" | "red" | "second-yellow";

type RefereeCardProps = {
  className?: string;
  type: RefereeCardType;
};

export const RefereeCard = ({ className, type }: RefereeCardProps) => {
  if (type === "second-yellow") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" className={className}>
        <path fill="#D9AF00" d="M7 7v12h8v3H4V7z" />
        <path fill="#c7361f" d="M9 2h11v15H9z" />
      </svg>
    );
  }

  const color = type === "yellow" ? "#D9AF00" : "#c7361f";

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className}>
      <path fill={color} fillRule="evenodd" d="M3 1h10v14H3z" />
    </svg>
  );
};
