interface Props {
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function RowActions({ onEdit, onDelete }: Props) {
  return (
    <div className="row-actions">
      <button className="link edit" onClick={onEdit}>Sửa</button>
      <button className="link" onClick={onDelete}>Xóa</button>
    </div>
  );
}
