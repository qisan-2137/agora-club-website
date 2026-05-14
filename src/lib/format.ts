export function formatDateLabel(value: string): string {
	const [year, month, day] = value.split("-");
	if (!year || !month || !day) {
		return value;
	}
	return `${year} 年 ${month} 月 ${day} 日`;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
