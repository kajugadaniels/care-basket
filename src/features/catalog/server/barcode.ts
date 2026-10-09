export function normalizeBarcode(input: string | null | undefined): string | null {
	if (!input || !/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(input)) return null;
	const digits = [...input].map(Number);
	const checkDigit = digits.pop();
	const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
	if ((10 - sum % 10) % 10 !== checkDigit) return null;
	if (input.length === 12) return `0${input}`;
	if (input.length === 14 && input.startsWith("0")) return input.slice(1);
	return input;
}
