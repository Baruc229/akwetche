"use client";

import {
  faHouseChimney, faBolt, faCar, faUtensils, faBasketShopping, faHeart,
  faGamepad, faGraduationCap, faRepeat, faCircleMinus, faWifi, faShirt,
  faGift, faPlane, faPaw, faTools, faDroplet, faFire, faPhone,
  faMoneyCheckDollar, faLaptopCode, faCashRegister, faChartLine,
  faCirclePlus, faBuilding, faHandshake, faLightbulb, faPalette,
} from '@fortawesome/free-solid-svg-icons';

export const EXPENSE_ICONS = [
  { key: "house",      label: "Logement",     icon: faHouseChimney },
  { key: "bolt",       label: "Électricité",  icon: faBolt },
  { key: "car",        label: "Transport",    icon: faCar },
  { key: "food",       label: "Alimentation", icon: faUtensils },
  { key: "groceries",  label: "Courses",      icon: faBasketShopping },
  { key: "health",     label: "Santé",        icon: faHeart },
  { key: "entertainment", label: "Loisirs",   icon: faGamepad },
  { key: "education",  label: "Éducation",    icon: faGraduationCap },
  { key: "bills",      label: "Abonnements",  icon: faRepeat },
  { key: "wifi",       label: "Internet/Tél.",icon: faWifi },
  { key: "clothing",   label: "Vêtements",    icon: faShirt },
  { key: "gift",       label: "Cadeaux",      icon: faGift },
  { key: "travel",     label: "Voyages",      icon: faPlane },
  { key: "pet",        label: "Animaux",      icon: faPaw },
  { key: "tools",      label: "Entretien",    icon: faTools },
  { key: "water",      label: "Eau",          icon: faDroplet },
  { key: "fire",       label: "Gaz",          icon: faFire },
  { key: "phone",      label: "Téléphone",    icon: faPhone },
  { key: "lightbulb",  label: "Éclairage",    icon: faLightbulb },
  { key: "palette",    label: "Autre",        icon: faPalette },
];

export const INCOME_ICONS = [
  { key: "salary",      label: "Salaire",         icon: faMoneyCheckDollar },
  { key: "freelance",   label: "Freelance",       icon: faLaptopCode },
  { key: "sales",       label: "Ventes",          icon: faCashRegister },
  { key: "investment",  label: "Investissements", icon: faChartLine },
  { key: "gift",        label: "Cadeau/Don",      icon: faGift },
  { key: "rent",        label: "Revenu locatif",  icon: faBuilding },
  { key: "handshake",   label: "Prestation",      icon: faHandshake },
  { key: "other",       label: "Autre revenu",    icon: faCirclePlus },
];

export const ALL_ICONS = [...EXPENSE_ICONS, ...INCOME_ICONS];

export function getIconByKey(key: string) {
  return ALL_ICONS.find(i => i.key === key)?.icon || faCircleMinus;
}

export function getDefaultIconForName(name: string): string {
  const map: Record<string, string> = {
    "salaire": "salary",
    "freelance": "freelance",
    "ventes": "sales",
    "investissements": "investment",
    "autres revenus": "other",
    "alimentation": "food",
    "logement": "house",
    "transport": "car",
    "électricité": "bolt",
    "eau": "water",
    "internet": "wifi",
    "téléphone": "phone",
    "santé": "health",
    "éducation": "education",
    "loisirs": "entertainment",
    "vêtements": "clothing",
    "autres dépenses": "palette",
    "cadeaux": "gift",
    "voyages": "travel",
    "animaux": "pet",
    "entretien": "tools",
    "gaz": "fire",
    "abonnements": "bills",
    "courses": "groceries",
    "location": "rent",
    "prestation": "handshake",
  };
  return map[name.toLowerCase().trim()] || "";
}
