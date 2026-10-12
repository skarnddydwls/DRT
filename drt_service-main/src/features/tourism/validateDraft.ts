export function validateAttractionDraft(station: string, draft: { name: string; category: string; display_order: number }): string | null {
  if (!station) return '먼저 왼쪽 정류장 목록에서 정류장을 선택해주세요.';
  if (!draft.name.trim()) return '장소명을 입력해주세요.';
  if (!draft.category.trim()) return '분류를 입력해주세요.';
  if (!Number.isInteger(draft.display_order) || draft.display_order < 0 || draft.display_order > 9999) return '표시 순서는 0~9999 사이의 정수로 입력해주세요.';
  return null;
}
