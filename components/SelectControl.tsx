import { Check, ChevronDown } from 'lucide-react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue } from 'react-aria-components';

interface SelectControlProps {
	label: string;
	value: string;
	options: { id: string; label: string }[];
	onChange: (value: string) => void;
	disabled?: boolean;
	hideLabel?: boolean;
}

/** 复用组件库的焦点、方向键和菜单定位行为，统一下拉控件的视觉。 */
export function SelectControl({ label, value, options, onChange, disabled, hideLabel }: SelectControlProps) {
	return <Select className={`select-control ${hideLabel ? 'compact-select' : ''}`} aria-label={hideLabel ? label : undefined} selectedKey={value} onSelectionChange={(key) => { if (key !== null) onChange(String(key)); }} isDisabled={disabled}>
		{!hideLabel && <Label className="control-label">{label}</Label>}
		<Button className="select-trigger"><SelectValue /><span className="select-chevron"><ChevronDown size={13} /></span></Button>
		<Popover className="control-popover select-popover" placement="bottom start" offset={5}><ListBox className="select-list" items={options}>{(option) => <ListBoxItem id={option.id} textValue={option.label} className="select-option">{({ isSelected }) => <><span>{option.label}</span>{isSelected && <Check size={13} />}</>}</ListBoxItem>}</ListBox></Popover>
	</Select>;
}
