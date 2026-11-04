export function validateCmsPasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): string {
  if (!currentPassword) return "請輸入目前密碼。";
  if (newPassword.length < 12 || newPassword.length > 256) {
    return "新密碼需要 12 至 256 個字元。";
  }
  if (newPassword !== confirmPassword) {
    return "兩次輸入的新密碼不一致。";
  }
  if (currentPassword === newPassword) {
    return "新密碼不可與目前密碼相同。";
  }
  return "";
}
