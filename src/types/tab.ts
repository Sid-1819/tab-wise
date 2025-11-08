export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active?: boolean;
  windowId?: number;
}

export interface TabGroup {
  domain: string;
  tabs: TabInfo[];
  favicon?: string;
}

export interface GroupedTabs {
  [domain: string]: TabGroup;
}

export interface DomainMapping {
  [key: string]: string;
}
