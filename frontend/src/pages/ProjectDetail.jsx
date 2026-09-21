import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProject, useProjects } from '../lib/queries';
import { priceRange, STATUS_LABEL, TYPE_LABEL, inr, videoEmbed } from '../lib/format';
import { PageLoader, StatusBadge } from '../components/ui';
import EnquiryForm from '../components/EnquiryForm';
import FavoriteButton from '../components/FavoriteButton';
import MapView from '../components/MapView';
import ProjectCard from '../components/ProjectCard';
import ImageLightbox from '../components/ImageLightbox';

const INTENT_FILTERS = [
  { key: 'SALE', label: 'Sell' },
  { key: 'RENT', label: 'Rent / Lease' },
  { key: 'PG', label: 'PG' },
];

const TAXONOMY_TREE = [
  {
    key: 'Residential',
    label: 'Residential',
    types: ['Apartment', 'Villa', 'Penthouse', 'Builder Floor', 'Studio', 'Duplex'],
  },
  {
    key: 'Plot / Land',
    label: 'Plot / Land',
    types: ['Residential Plot', 'Commercial Plot'],
  },
  {
    key: 'Commercial',
    label: 'Commercial',
    types: ['Shop / Retail', 'Office Space', 'Co-working', 'Showroom'],
  },
];

function resolvePropertyTypeInfo(u) {
  if (u.category?.parent?.name) {
    return {
      parentCategory: u.category.parent.name,
      propertyType: u.category.name,
    };
  }
  const catName = u.category?.name;
  if (catName) {
    for (const parent of TAXONOMY_TREE) {
      if (parent.types.some((t) => t.toLowerCase() === catName.toLowerCase())) {
        return { parentCategory: parent.label, propertyType: catName };
      }
      if (parent.label.toLowerCase() === catName.toLowerCase()) {
        return { parentCategory: parent.label, propertyType: parent.types[0] || catName };
      }
    }
  }
  const t = `${u.unitType || ''} ${u.name || ''}`.toLowerCase();
  if (/plot|land/.test(t)) {
    return {
      parentCategory: 'Plot / Land',
      propertyType: /commercial/.test(t) ? 'Commercial Plot' : 'Residential Plot',
    };
  }
  if (/shop|retail|showroom|office|space|commercial|co-working|warehouse/.test(t)) {
    return {
      parentCategory: 'Commercial',
      propertyType: /office/.test(t)
        ? 'Office Space'
        : /co-working/.test(t)
        ? 'Co-working'
        : /showroom/.test(t)
        ? 'Showroom'
        : 'Shop / Retail',
    };
  }
  const resType = /villa/.test(t)
    ? 'Villa'
    : /penthouse/.test(t)
    ? 'Penthouse'
    : /builder/.test(t)
    ? 'Builder Floor'
    : /studio/.test(t)
    ? 'Studio'
    : /duplex/.test(t)
    ? 'Duplex'
    : 'Apartment';
  return { parentCategory: 'Residential', propertyType: resType };
}

function getGroupTaxonomy(g, properties = []) {
  const gLabel = (g?.label || '').trim().toLowerCase();

  // 1. Check properties in the project
  for (const u of properties) {
    const catName = (u.category?.name || '').trim().toLowerCase();
    const uType = (u.unitType || '').trim().toLowerCase();
    if (catName === gLabel || uType === gLabel || (catName && gLabel.includes(catName))) {
      const info = resolvePropertyTypeInfo(u);
      return {
        parentCategory: info.parentCategory,
        propertyType: info.propertyType || u.category?.name || g.label,
        intent: u.listingIntent || 'SALE',
      };
    }
  }

  // 2. Exact match in TAXONOMY_TREE types
  for (const parent of TAXONOMY_TREE) {
    const exact = parent.types.find((t) => t.toLowerCase() === gLabel);
    if (exact) {
      return { parentCategory: parent.key, propertyType: exact, intent: 'SALE' };
    }
  }

  // 3. Partial match in TAXONOMY_TREE types
  for (const parent of TAXONOMY_TREE) {
    const matched = parent.types.find(
      (t) => t.toLowerCase().includes(gLabel) || gLabel.includes(t.toLowerCase())
    );
    if (matched) {
      return { parentCategory: parent.key, propertyType: matched, intent: 'SALE' };
    }
  }

  // 4. Match parent category label directly
  for (const parent of TAXONOMY_TREE) {
    if (parent.label.toLowerCase() === gLabel) {
      return { parentCategory: parent.key, propertyType: parent.types[0] || g.label, intent: 'SALE' };
    }
  }

  return { parentCategory: '', propertyType: g.label, intent: 'SALE' };
}

// SVG Icons for amenity cards
function AmenityIcon({ name }) {
  const n = (name || '').toLowerCase();
  if (n.includes('pool') || n.includes('swim')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12h20M2 17c2 0 3-1 5-1s3 1 5 1 3-1 5-1 3 1 5 1M2 21c2 0 3-1 5-1s3 1 5 1 3-1 5-1 3 1 5 1M7 9a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    );
  }
  if (n.includes('gym') || n.includes('fitness') || n.includes('workout')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4M6 12h12" />
      </svg>
    );
  }
  if (n.includes('club') || n.includes('community') || n.includes('lounge')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M16 11h2M16 15h2M10 21V11h4v10M9 3l3-2 3 2" />
      </svg>
    );
  }
  if (n.includes('secur') || n.includes('cctv') || n.includes('guard')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  if (n.includes('power') || n.includes('backup') || n.includes('electric') || n.includes('generator')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    );
  }
  if (n.includes('play') || n.includes('kid') || n.includes('child')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
      </svg>
    );
  }
  if (n.includes('park') || n.includes('garden') || n.includes('green') || n.includes('lawn') || n.includes('tree')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19V6M8 10a4 4 0 018 0c0 3-4 6-4 9 0-3-4-6-4-9z" />
      </svg>
    );
  }
  if (n.includes('car') || n.includes('parking') || n.includes('garage')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="9" rx="2" />
        <path d="M5 11l2-6h10l2 6M7 16h.01M17 16h.01" />
      </svg>
    );
  }
  if (n.includes('lift') || n.includes('elevator')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 10l3-3 3 3M9 14l3 3 3-3" />
      </svg>
    );
  }
  if (n.includes('sport') || n.includes('court') || n.includes('tennis') || n.includes('badminton')) {
    return (
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M4.93 4.93l14.14 14.14M14.83 9.17l-5.66 5.66" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function ProjectDetail() {
  const { idOrSlug } = useParams();
  const { data: project, isLoading, isError } = useProject(idOrSlug);
  const [selectedImg, setSelectedImg] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [filterIntent, setFilterIntent] = useState('');
  const [filterParent, setFilterParent] = useState('');
  const [filterType, setFilterType] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);

  // Inventory card filter toggle handler
  const handleInventoryCardClick = (g) => {
    const tax = getGroupTaxonomy(g, properties);
    const targetType = tax.propertyType || g.label;

    const isCurrentlySelected =
      filterType &&
      (filterType.toLowerCase() === g.label.toLowerCase() ||
       filterType.toLowerCase() === targetType.toLowerCase());

    if (isCurrentlySelected) {
      // Toggle off / clear filter
      setFilterType('');
      setFilterParent('');
    } else {
      // Set parent category and property type
      if (tax.parentCategory) {
        setFilterParent(tax.parentCategory);
      }
      setFilterType(targetType);

      // Ensure filterIntent doesn't hide units of this group
      if (filterIntent) {
        const unitsInGroup = properties.filter((u) => {
          const cat = (u.category?.name || '').toLowerCase();
          const uType = (u.unitType || '').toLowerCase();
          const target = g.label.toLowerCase();
          return cat === target || uType === target || cat.includes(target);
        });
        const matchesCurrentIntent = unitsInGroup.some((u) => (u.listingIntent || 'SALE') === filterIntent);
        if (!matchesCurrentIntent && unitsInGroup.length > 0) {
          setFilterIntent(unitsInGroup[0].listingIntent || '');
        }
      }
    }
  };

  const getCardActiveState = (g) => {
    const tax = getGroupTaxonomy(g, properties);
    const targetType = tax.propertyType || g.label;
    const isExact =
      !!filterType &&
      (filterType.toLowerCase() === g.label.toLowerCase() ||
       filterType.toLowerCase() === targetType.toLowerCase());
    const isParent =
      !filterType &&
      !!filterParent &&
      !!tax.parentCategory &&
      tax.parentCategory.toLowerCase() === filterParent.toLowerCase();
    return { isExact, isParent, isSelected: isExact || isParent };
  };

  // Recommendations: same category/type
  const { data: similarData } = useProjects(
    { type: project?.type, limit: 8, sort: 'newest' },
    { enabled: !!project }
  );

  const images = useMemo(() => project?.media?.filter((m) => m.kind === 'IMAGE') || [], [project]);
  const floorPlans = useMemo(() => project?.media?.filter((m) => m.kind === 'FLOOR_PLAN') || [], [project]);
  const masterPlans = useMemo(() => {
    const list = project?.media?.filter((m) => m.kind === 'MASTER_PLAN') || [];
    if (project?.masterPlanUrl) {
      return [{ id: 'mp0', url: project.masterPlanUrl, title: 'Master layout plan' }, ...list];
    }
    return list;
  }, [project]);

  const gallery = images.length ? images : [{ id: 'ph', url: `https://picsum.photos/seed/${project?.id || 'prj'}/1200/700`, title: project?.name }];
  const inventory = project?.inventory || [];
  const properties = project?.properties || [];
  const video = videoEmbed(project?.featuredVideoUrl);
  const similar = (similarData?.data || []).filter((p) => p.id !== project?.id).slice(0, 4);

  const totalAvailableStock = useMemo(() => {
    return properties.reduce((sum, u) => sum + (u.status === 'SOLD' ? 0 : (u.availableUnits ?? 1)), 0);
  }, [properties]);
  const totalUnitsStock = useMemo(() => {
    return properties.reduce((sum, u) => sum + (u.totalUnits ?? 1), 0);
  }, [properties]);
  const isProjectSoldOut = properties.length > 0 && totalAvailableStock <= 0;

  const [activeTourIndex, setActiveTourIndex] = useState(0);
  const [activeVideoUnit, setActiveVideoUnit] = useState(null);
  const [unitViewMode, setUnitViewMode] = useState('table');

  const unitsWithVideo = useMemo(() => properties.filter((u) => !!u.videoUrl), [properties]);

  const allTours = useMemo(() => {
    const list = [];
    if (video) {
      list.push({
        id: 'project-overview-tour',
        title: 'Project Overview',
        sub: 'Overall premises & architecture',
        type: video.type,
        src: video.src,
        isProject: true,
      });
    }
    unitsWithVideo.forEach((u) => {
      const emb = videoEmbed(u.videoUrl);
      if (emb) {
        list.push({
          id: u.id,
          title: u.unitType || u.name || 'Unit Walkthrough',
          sub: [u.category?.name, u.carpetArea ? `${u.carpetArea} ${u.areaUnit || 'sqft'}` : null, u.price ? inr(u.price) : null].filter(Boolean).join(' · '),
          type: emb.type,
          src: emb.src,
          isProject: false,
          unit: u,
        });
      }
    });
    return list;
  }, [video, unitsWithVideo]);

  const currentTour = allTours[activeTourIndex] || allTours[0];
  const hasVideo = allTours.length > 0;
  const hasInventory = inventory.length > 0 || properties.length > 0;
  const hasPlans = masterPlans.length > 0 || floorPlans.length > 0;
  const hasAmenities = (project?.amenities || []).length > 0;

  // Filter units by 3-tier taxonomy: Intent, Category, and Property Type
  const filteredUnits = useMemo(() => {
    return properties.filter((u) => {
      const typeInfo = resolvePropertyTypeInfo(u);

      // 1. Intent filter (Sell / Rent / PG)
      if (filterIntent) {
        const uIntent = u.listingIntent || 'SALE';
        if (uIntent !== filterIntent) return false;
      }

      // 2. Parent category filter ("And it's a...")
      if (filterParent) {
        if (typeInfo.parentCategory.toLowerCase() !== filterParent.toLowerCase()) {
          return false;
        }
      }

      // 3. Subcategory / Property type filter
      if (filterType) {
        const matchesCategory =
          typeInfo.propertyType.toLowerCase() === filterType.toLowerCase() ||
          (u.category?.name && u.category.name.toLowerCase() === filterType.toLowerCase());

        const matchesUnitType =
          u.unitType && u.unitType.toLowerCase().includes(filterType.toLowerCase());

        if (!matchesCategory && !matchesUnitType) {
          return false;
        }
      }

      return true;
    });
  }, [properties, filterIntent, filterParent, filterType]);

  // Available sub-types for the current parent selection
  const availableSubTypes = useMemo(() => {
    if (filterParent) {
      const parentObj = TAXONOMY_TREE.find((t) => t.key.toLowerCase() === filterParent.toLowerCase());
      return parentObj ? parentObj.types : [];
    }
    const types = new Set();
    properties.forEach((u) => {
      const info = resolvePropertyTypeInfo(u);
      if (info.propertyType) types.add(info.propertyType);
    });
    if (types.size === 0) {
      TAXONOMY_TREE.forEach((p) => p.types.forEach((t) => types.add(t)));
    }
    return Array.from(types);
  }, [filterParent, properties]);

  if (isLoading) return <PageLoader />;
  if (isError || !project) {
    return (
      <div className="container-app py-24 text-center">
        <h2 className="text-xl font-bold text-slate-800">Project Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">The project you are looking for does not exist or has been removed.</p>
        <Link to="/projects" className="btn-primary mt-6 inline-flex">Explore All Projects</Link>
      </div>
    );
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Project link copied to clipboard!');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const lat = project.lat;
  const lng = project.lng;
  const mapsSearchUrl = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;
  const mapsDirectionsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;

  const currentHero = gallery[selectedImg] || gallery[0];

  return (
    <div className="container-app py-6 lg:py-10">
      {/* Breadcrumbs & Top Meta */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <nav className="flex items-center gap-2">
          <Link to="/" className="hover:text-brand-700">Home</Link>
          <span>/</span>
          <Link to="/projects" className="hover:text-brand-700">Projects</Link>
          <span>/</span>
          <span className="max-w-[200px] truncate font-medium text-slate-700 sm:max-w-xs">{project.name}</span>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
          <FavoriteButton projectId={project.id} className="btn-outline !py-1.5 !px-3 text-xs" />
        </div>
      </div>

      {/* Main Grid: Content Column (Left) + Sticky Sidebar (Right) */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px]">
        {/* Left Column: All distributed sections */}
        <div className="space-y-10 min-w-0">
          {/* 1. Hero Gallery */}
          <div className="space-y-3">
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
              <img
                src={currentHero.url}
                alt={project.name}
                className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.01]"
              />
              {/* Fullscreen zoom trigger */}
              <button
                type="button"
                onClick={() => setLightbox({ src: currentHero.url, alt: currentHero.title || project.name })}
                className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                View Fullscreen
              </button>

              {/* Photo count badge */}
              <div className="absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                📷 {selectedImg + 1} of {gallery.length} Photos
              </div>

              {/* Watch Video shortcut */}
              {hasVideo && (
                <button
                  type="button"
                  onClick={() => scrollToSection('video')}
                  className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-brand-600/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-brand-600"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Video Tour {allTours.length > 1 ? `(${allTours.length})` : ''}
                </button>
              )}
            </div>

            {/* Gallery Thumbnails */}
            {gallery.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {gallery.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setSelectedImg(idx)}
                    className={`relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImg === idx ? 'border-brand-600 ring-2 ring-brand-500/20 shadow-sm' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Project Title & Key Metrics Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge bg-brand-50 text-brand-700 font-semibold">{TYPE_LABEL[project.type] || project.type}</span>
                  {isProjectSoldOut ? (
                    <span className="badge bg-rose-600 font-extrabold text-white shadow-sm">SOLD OUT</span>
                  ) : (
                    <StatusBadge status={project.status} label={STATUS_LABEL[project.status]} />
                  )}
                  {project.reraNo && (
                    <span className="badge bg-slate-100 text-slate-600">
                      RERA: {project.reraNo}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{project.name}</h1>
                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                  <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {[project.address, project.city, project.state, project.pincode].filter(Boolean).join(', ')}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs uppercase font-medium tracking-wide text-slate-400">Price Range</p>
                <p className={`text-2xl font-extrabold sm:text-3xl ${isProjectSoldOut ? 'text-slate-400 line-through' : 'text-brand-700'}`}>
                  {priceRange(project.priceMin, project.priceMax)}
                </p>
                {properties.length > 0 && (
                  isProjectSoldOut ? (
                    <p className="mt-1 text-xs font-bold text-rose-600">
                      All {totalUnitsStock} units are currently SOLD OUT
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-emerald-700">
                      {totalAvailableStock} of {totalUnitsStock} units available across {inventory.length || properties.length} typologies
                    </p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* 3. Sticky Quick-Jump Navigation Bar */}
          <div className="sticky top-16 z-20 -mx-4 px-4 py-2.5 bg-white/95 backdrop-blur-md border-y border-slate-200 shadow-sm sm:mx-0 sm:rounded-xl sm:border">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => scrollToSection('overview')}
                className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
              >
                Overview
              </button>
              {hasVideo && (
                <button
                  type="button"
                  onClick={() => scrollToSection('video')}
                  className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
                >
                  Video Tour {allTours.length > 1 ? `(${allTours.length})` : ''}
                </button>
              )}
              {hasInventory && (
                <button
                  type="button"
                  onClick={() => scrollToSection('inventory')}
                  className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
                >
                  Units &amp; Pricing
                </button>
              )}
              {hasPlans && (
                <button
                  type="button"
                  onClick={() => scrollToSection('plans')}
                  className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
                >
                  Floor &amp; Master Plans
                </button>
              )}
              {hasAmenities && (
                <button
                  type="button"
                  onClick={() => scrollToSection('amenities')}
                  className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
                >
                  Amenities
                </button>
              )}
              <button
                type="button"
                onClick={() => scrollToSection('location')}
                className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
              >
                Location
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('enquire')}
                className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 transition hover:bg-brand-100 active:scale-95"
              >
                Enquire Now
              </button>
            </div>
          </div>

          {/* 4. Section: Overview & Developer Highlights */}
          <section id="overview" className="scroll-mt-28 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Project Overview</h2>
                <p className="text-xs text-slate-500">Key specifications, developer details, and architectural description</p>
              </div>
            </div>

            {/* Developer Card */}
            {project.developer && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
                    {project.developer.logoUrl ? (
                      <img src={project.developer.logoUrl} alt={project.developer.name} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-base font-bold text-brand-700">{project.developer.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Developed By</span>
                    <h3 className="text-base font-bold text-slate-900">{project.developer.name}</h3>
                    <p className="text-xs text-slate-500">Verified &amp; trusted developer</p>
                  </div>
                </div>
                {project.developer.website && (
                  <a
                    href={project.developer.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                  >
                    Visit Developer Site
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Key Project Specifications Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Builder</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{project.developer?.name || project.builder || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Project Type</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{TYPE_LABEL[project.type] || project.type}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Construction Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{STATUS_LABEL[project.status] || project.status}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Units</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{project.counts?.properties || properties.length || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Location City</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{project.city || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Pincode</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{project.pincode || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">RERA Registration</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800" title={project.reraNo || 'Not available'}>
                  {project.reraNo || 'On request'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Starting Price</p>
                <p className="mt-1 text-sm font-semibold text-brand-700">{project.priceMin ? inr(project.priceMin) : 'On request'}</p>
              </div>
            </div>

            {/* Description Narrative */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">About {project.name}</h4>
              <div className="relative">
                <p
                  className={`whitespace-pre-line text-sm leading-relaxed text-slate-600 transition-all duration-200 ${
                    !descExpanded && (project.description?.length || 0) > 360 ? 'line-clamp-4' : ''
                  }`}
                >
                  {project.description || 'No detailed project description has been added yet. Contact developer or enquire below for full project brochure.'}
                </p>
                {(project.description?.length || 0) > 360 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    {descExpanded ? 'Read Less ↑' : 'Read More ↓'}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Featured Video / Virtual Tour (Shown below Project Overview if added from admin or units have videos) */}
          {hasVideo && (
            <section id="video" className="scroll-mt-28 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                      <line x1="7" y1="2" x2="7" y2="22" />
                      <line x1="17" y1="2" x2="17" y2="22" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Virtual Tour &amp; Video Walkthrough</h2>
                    <p className="text-xs text-slate-500">
                      {allTours.length > 1
                        ? `Watch project overview or unit-specific walkthroughs (${allTours.length} tours available)`
                        : 'Take an immersive video tour of the project and premises'}
                    </p>
                  </div>
                </div>

                {/* Tour Selector Pills if multiple videos exist */}
                {allTours.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allTours.map((t, idx) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTourIndex(idx)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          activeTourIndex === idx
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Player */}
              <div className="overflow-hidden rounded-xl bg-black shadow-inner">
                {currentTour?.type === 'iframe' ? (
                  <iframe
                    key={currentTour.src}
                    src={currentTour.src}
                    title={currentTour.title}
                    allowFullScreen
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <video
                    key={currentTour?.src}
                    src={currentTour?.src}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full"
                  >
                    <source src={currentTour?.src} type="video/mp4" />
                    Your browser does not support HTML5 video playback.
                  </video>
                )}
              </div>

              {/* Unit Info banner below player if viewing a property walkthrough */}
              {!currentTour?.isProject && currentTour?.unit && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{currentTour.unit.unitType || currentTour.unit.name}</span>
                    {currentTour.unit.carpetArea && <span>• {currentTour.unit.carpetArea} {currentTour.unit.areaUnit || 'sqft'}</span>}
                    {currentTour.unit.price && <span className="font-bold text-brand-700">• {inr(currentTour.unit.price)}</span>}
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">{currentTour.unit.status}</span>
                  </div>
                  <Link
                    to={`/properties/${currentTour.unit.id}`}
                    className="font-semibold text-brand-700 hover:underline inline-flex items-center gap-1"
                  >
                    View Full Property Details →
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* 5. Section: Available Units & Inventory */}
          {hasInventory && (
            <section id="inventory" className="scroll-mt-28 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Configurations &amp; Available Inventory</h2>
                    <p className="text-xs text-slate-500">Live units, typologies, carpet areas, and stock availability</p>
                  </div>
                </div>

                {properties.length > 0 && (
                  isProjectSoldOut ? (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-700 ring-1 ring-rose-300">
                      All Units Sold Out
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        {totalAvailableStock} Available Units
                      </span>
                      {totalUnitsStock - totalAvailableStock > 0 && (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-200">
                          {totalUnitsStock - totalAvailableStock} Sold
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Inventory Configuration Cards */}
              {inventory.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {inventory.map((g) => {
                    const isGroupSoldOut = g.isSoldOut || g.available <= 0;
                    const { isExact, isParent, isSelected } = getCardActiveState(g);
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => handleInventoryCardClick(g)}
                        aria-pressed={isSelected}
                        className={`group relative rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                          isExact
                            ? 'border-brand-500 bg-gradient-to-br from-brand-50/60 via-white to-brand-50/20 ring-2 ring-brand-500/30 shadow-md -translate-y-0.5'
                            : isParent
                            ? 'border-brand-300 bg-brand-50/20 shadow-xs'
                            : isGroupSoldOut
                            ? 'border-rose-200 bg-rose-50/40 opacity-90 hover:opacity-100 hover:border-rose-300'
                            : 'border-slate-200 bg-slate-50/50 hover:border-brand-300 hover:bg-white hover:shadow-md hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-base font-bold truncate ${isExact ? 'text-brand-900' : 'text-slate-900'}`}>
                              {g.label}
                            </span>
                            {isExact && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Selected
                              </span>
                            )}
                          </div>
                          {isGroupSoldOut ? (
                            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-white shadow-xs shrink-0">
                              SOLD OUT
                            </span>
                          ) : (
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 shrink-0 ${
                              isExact
                                ? 'bg-brand-100 text-brand-800 ring-brand-300'
                                : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                            }`}>
                              {g.available} of {g.total} Avail
                            </span>
                          )}
                        </div>

                        <p className={`mt-1 text-base font-extrabold ${
                          isGroupSoldOut
                            ? 'text-slate-400 line-through'
                            : isExact
                            ? 'text-brand-700'
                            : 'text-brand-600'
                        }`}>
                          {g.priceMin ? priceRange(g.priceMin, g.priceMax) : 'Price on request'}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {g.configs?.map((c) => (
                            <span
                              key={c.label}
                              className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                                isExact
                                  ? 'bg-brand-100/70 text-brand-800 font-semibold'
                                  : 'bg-slate-200/60 text-slate-700 group-hover:bg-slate-200'
                              }`}
                            >
                              {c.label} ({c.count})
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                          <span>
                            {isExact ? (
                              <span className="font-semibold text-rose-600 group-hover:underline">
                                Click to clear filter
                              </span>
                            ) : (
                              <span className="group-hover:text-brand-600 transition-colors">
                                Click to filter {g.label}
                              </span>
                            )}
                          </span>
                          <span className="text-slate-300 group-hover:text-brand-500 transition-colors">
                            {isExact ? '✕' : '→'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Interactive Property Type Filters & Table */}
              {properties.length > 0 && (
                <div className="space-y-4">
                  {/* 3-Tier Property Filter matching the user's reference design */}
                  <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                    {/* Tier 1: You're looking to... */}
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-800">You're looking to…</p>
                      <div className="flex flex-wrap gap-2.5">
                        {INTENT_FILTERS.map((item) => {
                          const active = filterIntent === item.key;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setFilterIntent((prev) => (prev === item.key ? '' : item.key))}
                              className={`rounded-full px-5 py-2 text-sm font-medium transition cursor-pointer ${
                                active
                                  ? 'border-2 border-brand-500 bg-white text-brand-600 font-semibold shadow-xs ring-1 ring-brand-500/10'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tier 2: And it's a... */}
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-800">And it's a…</p>
                      <div className="flex flex-wrap gap-2.5">
                        {TAXONOMY_TREE.map((parent) => {
                          const active = filterParent === parent.key;
                          return (
                            <button
                              key={parent.key}
                              type="button"
                              onClick={() => {
                                setFilterParent((prev) => (prev === parent.key ? '' : parent.key));
                                setFilterType('');
                              }}
                              className={`rounded-full px-5 py-2 text-sm font-medium transition cursor-pointer ${
                                active
                                  ? 'border-2 border-brand-500 bg-white text-brand-600 font-semibold shadow-xs ring-1 ring-brand-500/10'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70'
                              }`}
                            >
                              {parent.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tier 3: Property type */}
                    {availableSubTypes.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-800">Property type</p>
                        <div className="flex flex-wrap gap-2.5">
                          {availableSubTypes.map((typeName) => {
                            const active = filterType.toLowerCase() === typeName.toLowerCase();
                            return (
                              <button
                                key={typeName}
                                type="button"
                                onClick={() => {
                                  if (filterType.toLowerCase() === typeName.toLowerCase()) {
                                    setFilterType('');
                                  } else {
                                    setFilterType(typeName);
                                    if (!filterParent) {
                                      const parentObj = TAXONOMY_TREE.find((p) => p.types.some((t) => t.toLowerCase() === typeName.toLowerCase()));
                                      if (parentObj) setFilterParent(parentObj.key);
                                    }
                                  }
                                }}
                                className={`rounded-full px-5 py-2 text-sm font-medium transition cursor-pointer ${
                                  active
                                  ? 'border-2 border-brand-500 bg-white text-brand-600 font-semibold shadow-xs ring-1 ring-brand-500/10'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70'
                                }`}
                              >
                                {typeName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Filter Active Summary & Reset */}
                    {(filterIntent || filterParent || filterType) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>Filter applied:</span>
                          {filterIntent && (
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                              {INTENT_FILTERS.find((i) => i.key === filterIntent)?.label}
                            </span>
                          )}
                          {filterParent && (
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                              {filterParent}
                            </span>
                          )}
                          {filterType && (
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                              {filterType}
                            </span>
                          )}
                          <span className="text-slate-400">({filteredUnits.length} of {properties.length} properties)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterIntent('');
                            setFilterParent('');
                            setFilterType('');
                          }}
                          className="font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Clear all filters ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {filteredUnits.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                      <p className="font-semibold text-slate-700">No properties in this project match the selected type.</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Try selecting another property type or clear the filters above.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterIntent('');
                          setFilterParent('');
                          setFilterType('');
                        }}
                        className="btn-outline mt-3 text-xs"
                      >
                        Show all properties ({properties.length})
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* View Mode Header & Counter */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Available Units & Configurations
                            <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                              {filteredUnits.length}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">Live floor plans, dimensions, inventory and pricing</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                          <button
                            type="button"
                            onClick={() => setUnitViewMode('table')}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                              unitViewMode === 'table'
                                ? 'bg-white text-brand-700 shadow-xs ring-1 ring-slate-200/70'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                            </svg>
                            Table / Row Cards
                          </button>
                          <button
                            type="button"
                            onClick={() => setUnitViewMode('cards')}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                              unitViewMode === 'cards'
                                ? 'bg-white text-brand-700 shadow-xs ring-1 ring-slate-200/70'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="7" height="7" rx="1.5" />
                              <rect x="14" y="3" width="7" height="7" rx="1.5" />
                              <rect x="3" y="14" width="7" height="7" rx="1.5" />
                              <rect x="14" y="14" width="7" height="7" rx="1.5" />
                            </svg>
                            Grid Cards
                          </button>
                        </div>
                      </div>

                      {/* 1. Vertical Cards Grid Listing */}
                      {unitViewMode === 'cards' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {filteredUnits.map((u) => {
                            const isUnitSold = u.status === 'SOLD' || (u.availableUnits != null && u.availableUnits <= 0);
                            const availCount = isUnitSold ? 0 : (u.availableUnits ?? 1);
                            const totalCount = u.totalUnits ?? 1;
                            const unitImg =
                              u.coverImage ||
                              u.media?.[0]?.url ||
                              (project?.coverImage && !project.coverImage.includes('banner') ? project.coverImage : null) ||
                              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=80';

                            const hasSpecs = !!(u.carpetArea || u.bedrooms || u.bathrooms || u.facing || u.floor);

                            return (
                              <div
                                key={u.id}
                                className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                                  isUnitSold
                                    ? 'border-rose-200/80 bg-rose-50/15'
                                    : 'border-slate-200/90 bg-white hover:border-brand-300 shadow-xs'
                                }`}
                              >
                                {/* Card Media Header - Clean & Spacious without badge clutter */}
                                <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-slate-100">
                                  <img
                                    src={unitImg}
                                    alt={u.unitType || u.name || 'Unit'}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

                                  {/* Top Left: Category Badge */}
                                  <div className="absolute left-3 top-3 flex items-center gap-1.5">
                                    {u.category?.name && (
                                      <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-brand-700 shadow-md backdrop-blur-md">
                                        {u.category.name}
                                      </span>
                                    )}
                                  </div>

                                  {/* Top Right: Status Badge */}
                                  <div className="absolute right-3 top-3">
                                    {isUnitSold ? (
                                      <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-md">
                                        Sold Out
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                                        {u.status?.replace('_', ' ') || 'Available'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Card Body */}
                                <div className="flex flex-1 flex-col p-5">
                                  {/* Price Row */}
                                  <div className="flex items-baseline justify-between gap-2">
                                    <div>
                                      <span className={`text-xl font-black tracking-tight ${isUnitSold ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                        {u.price ? inr(u.price) : 'Price on request'}
                                      </span>
                                      {u.price && u.carpetArea && (
                                        <span className="ml-2 text-xs font-semibold text-brand-600">
                                          ({inr(Math.round(Number(u.price) / Number(u.carpetArea)))}/sqft)
                                        </span>
                                      )}
                                    </div>
                                    {u.listingIntent && (
                                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                                        {u.listingIntent === 'RENT' ? 'For Rent' : u.listingIntent === 'PG' ? 'PG' : 'For Sale'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Unit Title & Identifier */}
                                  <h4 className="mt-1.5 text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                                    {u.unitType || u.name || 'Standard Unit'}
                                  </h4>
                                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                                    {[
                                      u.facing ? `${u.facing} Facing` : null,
                                      u.floor ? `Floor ${u.floor}` : null,
                                      u.carpetArea ? `${u.carpetArea} ${u.areaUnit || 'sqft'}` : null,
                                    ].filter(Boolean).join(' • ') || 'Unit Configuration'}
                                  </p>

                                  {/* Specifications Strip */}
                                  {hasSpecs ? (
                                    <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                                      {u.carpetArea && (
                                        <span className="inline-flex items-center gap-1.5 font-medium">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-400 shrink-0">
                                            <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4m12-6v4a2 2 0 0 1-2 2h-4" />
                                          </svg>
                                          {u.carpetArea} {u.areaUnit || 'sqft'}
                                        </span>
                                      )}
                                      {u.bedrooms && (
                                        <span className="inline-flex items-center gap-1.5 font-medium">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-400 shrink-0">
                                            <path d="M3 12V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 12h18M3 12v5m18-5v5M6 9h4M3 17h18" />
                                          </svg>
                                          {u.bedrooms} BHK
                                        </span>
                                      )}
                                      {u.bathrooms && (
                                        <span className="inline-flex items-center gap-1.5 font-medium">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-400 shrink-0">
                                            <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM7 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2M5 19l-1 2m15-2l1 2" />
                                          </svg>
                                          {u.bathrooms} Bath
                                        </span>
                                      )}
                                      {u.facing && (
                                        <span className="inline-flex items-center gap-1.5 font-medium">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-400 shrink-0">
                                            <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16 8l-2 6-6 2 2-6 6-2z" />
                                          </svg>
                                          {u.facing}
                                        </span>
                                      )}
                                      {u.floor && (
                                        <span className="inline-flex items-center gap-1.5 font-medium">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-400 shrink-0">
                                            <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M4 21h16M9 21v-4h2v4M9 8h1M14 8h1M9 12h1M14 12h1M15 21V11h4a1 1 0 0 1 1 1v9" />
                                          </svg>
                                          Floor {u.floor}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 border border-slate-100">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-400 shrink-0">
                                        <circle cx="12" cy="12" r="9" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                      </svg>
                                      <span>Floor plan &amp; specifications available</span>
                                    </div>
                                  )}

                                  {/* Stock / Availability Tracker */}
                                  <div className="mt-4 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                      <span className="font-semibold text-slate-600">Stock Availability</span>
                                      {isUnitSold ? (
                                        <span className="inline-flex items-center gap-1.5 font-bold text-rose-600">
                                          <span className="h-2 w-2 rounded-full bg-rose-600" />
                                          Sold Out (0/{totalCount})
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                          {availCount} of {totalCount} in stock
                                        </span>
                                      )}
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${isUnitSold ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${isUnitSold ? 100 : Math.min(100, Math.max(15, Math.round((availCount / totalCount) * 100)))}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2.5">
                                    {u.videoUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setActiveVideoUnit(u)}
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/90 hover:bg-emerald-100 px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition shadow-xs cursor-pointer"
                                        title="Watch video walkthrough"
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Video
                                      </button>
                                    )}
                                    <Link
                                      to={`/properties/${u.id}`}
                                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-4 text-xs font-bold transition shadow-sm ${
                                        isUnitSold
                                          ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                          : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-600/10'
                                      }`}
                                    >
                                      <span>View Unit Details</span>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                      </svg>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Table / Row Card View (Matching User Reference & Mobile Card-like Table View) */}
                      {unitViewMode === 'table' && (
                        <div className="space-y-4">
                          {filteredUnits.map((u) => {
                            const isUnitSold = u.status === 'SOLD' || (u.availableUnits != null && u.availableUnits <= 0);
                            const availCount = isUnitSold ? 0 : (u.availableUnits ?? 1);
                            const totalCount = u.totalUnits ?? 1;
                            const unitImg =
                              u.coverImage ||
                              u.media?.[0]?.url ||
                              (project?.coverImage && !project.coverImage.includes('banner') ? project.coverImage : null) ||
                              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=80';
                            const psf = u.price && u.carpetArea ? `${inr(Math.round(Number(u.price) / Number(u.carpetArea)))}/sqft` : null;

                            return (
                              <div
                                key={u.id}
                                className={`card group overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 transition hover:border-slate-300 hover:shadow-md ${
                                  isUnitSold ? 'opacity-85' : ''
                                }`}
                              >
                                {/* Mobile View: Compact Card-Like Table View */}
                                <div className="block sm:hidden">
                                  {/* Top Header: Compact Thumbnail + Details */}
                                  <div className="flex gap-3 items-start">
                                    {/* Compact Thumbnail on Left */}
                                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                      <img
                                        src={unitImg}
                                        alt={u.unitType || u.name || 'Unit'}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                      />
                                      {/* Status Badge */}
                                      <div className="absolute left-1.5 top-1.5">
                                        {isUnitSold ? (
                                          <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
                                            SOLD
                                          </span>
                                        ) : (
                                          <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-xs">
                                            {u.status?.replace('_', ' ') || 'AVAILABLE'}
                                          </span>
                                        )}
                                      </div>
                                      {/* Video Button */}
                                      {u.videoUrl && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setActiveVideoUnit(u);
                                          }}
                                          className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur shadow-xs cursor-pointer"
                                          title="Watch video walkthrough"
                                        >
                                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                          </svg>
                                          <span>Video</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Right Details */}
                                    <div className="flex flex-1 min-w-0 flex-col justify-between self-stretch py-0.5">
                                      <div>
                                        <div className="flex items-start justify-between gap-1.5">
                                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition line-clamp-1">
                                            {u.unitType || u.name || 'Standard Unit'}
                                          </h4>
                                          {u.category?.name && (
                                            <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                                              {u.category.name}
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 line-clamp-1">
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 shrink-0">
                                            <path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                                          </svg>
                                          <span>{project?.name || project?.city || u.city || 'Project Property'}</span>
                                        </p>
                                      </div>

                                      {/* Price & PSF */}
                                      <div className="mt-1">
                                        <span className={`text-base font-bold ${isUnitSold ? 'text-slate-400 line-through' : 'text-brand-700'}`}>
                                          {u.price ? inr(u.price) : 'Price on request'}
                                        </span>
                                        {psf && <span className="ml-1.5 text-[10px] font-medium text-slate-400">· {psf}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Middle: Structured 4-Column Table Grid on Mobile */}
                                  <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/90">
                                    <div className="grid grid-cols-4 divide-x divide-slate-200/70 py-1.5 text-center">
                                      <div className="px-1">
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Area</span>
                                        <span className="block mt-0.5 text-[11px] font-bold text-slate-800 truncate">
                                          {u.carpetArea ? `${u.carpetArea} ${u.areaUnit || 'sqft'}` : '—'}
                                        </span>
                                      </div>
                                      <div className="px-1">
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Config</span>
                                        <span className="block mt-0.5 text-[11px] font-bold text-slate-800 truncate">
                                          {u.bedrooms ? `${u.bedrooms} BHK` : u.category?.name || '—'}
                                        </span>
                                      </div>
                                      <div className="px-1">
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Floor</span>
                                        <span className="block mt-0.5 text-[11px] font-bold text-slate-800 truncate">
                                          {u.floor ? `Floor ${u.floor}` : '—'}
                                        </span>
                                      </div>
                                      <div className="px-1">
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Facing</span>
                                        <span className="block mt-0.5 text-[11px] font-bold text-slate-800 truncate">
                                          {u.facing || '—'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bottom: Stock Availability + View Unit Button */}
                                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                                    <div className="flex items-center gap-1.5 text-xs">
                                      {isUnitSold ? (
                                        <span className="font-bold text-rose-600">● Sold Out</span>
                                      ) : (
                                        <span className="font-semibold text-emerald-700">● {availCount} of {totalCount} in stock</span>
                                      )}
                                    </div>
                                    <Link
                                      to={`/properties/${u.id}`}
                                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
                                    >
                                      <span>View Unit</span>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                      </svg>
                                    </Link>
                                  </div>
                                </div>

                                {/* Desktop View: Horizontal Row Card */}
                                <div className="hidden sm:flex sm:flex-row gap-4">
                                  {/* Left Thumbnail Image */}
                                  <div className="relative aspect-[4/3] w-52 md:w-60 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                    <img
                                      src={unitImg}
                                      alt={u.unitType || u.name || 'Unit'}
                                      loading="lazy"
                                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                    {/* Status Badge */}
                                    <div className="absolute left-2.5 top-2.5">
                                      {isUnitSold ? (
                                        <span className="badge bg-rose-600 font-extrabold text-white shadow-md">
                                          SOLD OUT
                                        </span>
                                      ) : (
                                        <span className="badge bg-emerald-500/95 font-bold uppercase text-white shadow-md">
                                          {u.status?.replace('_', ' ') || 'AVAILABLE'}
                                        </span>
                                      )}
                                    </div>

                                    {/* Video Button */}
                                    {u.videoUrl && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setActiveVideoUnit(u);
                                        }}
                                        className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-slate-900/80 hover:bg-brand-600 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition shadow-md cursor-pointer"
                                        title="Watch video walkthrough"
                                      >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                        <span>Video</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Right Details Container */}
                                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                                    <div>
                                      {/* Price & Category */}
                                      <div className="flex items-baseline justify-between gap-2">
                                        <p className={`text-lg sm:text-xl font-bold ${isUnitSold ? 'text-slate-400 line-through' : 'text-brand-700'}`}>
                                          {u.price ? inr(u.price) : 'Price on request'}
                                          {psf && <span className="ml-2 text-xs font-medium text-slate-400">· {psf}</span>}
                                        </p>
                                        {u.category?.name && (
                                          <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                                            {u.category.name}
                                          </span>
                                        )}
                                      </div>

                                      {/* Title */}
                                      <h3 className="mt-1 text-base font-semibold text-slate-900 group-hover:text-brand-700 transition line-clamp-1">
                                        {u.unitType || u.name || 'Standard Unit'}
                                      </h3>

                                      {/* Location */}
                                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 line-clamp-1">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 shrink-0">
                                          <path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                                        </svg>
                                        <span>{project?.name || project?.city || u.city || 'Project Property'}</span>
                                      </p>
                                    </div>

                                    {/* Middle: Tabular Specs Grid for Desktop */}
                                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80">
                                      <div className="grid grid-cols-4 divide-x divide-slate-200/60 py-2 text-center text-xs">
                                        <div className="px-2">
                                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Area</span>
                                          <span className="block mt-0.5 font-bold text-slate-800 text-xs truncate">
                                            {u.carpetArea ? `${u.carpetArea} ${u.areaUnit || 'sqft'}` : '—'}
                                          </span>
                                        </div>
                                        <div className="px-2">
                                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Config</span>
                                          <span className="block mt-0.5 font-bold text-slate-800 text-xs truncate">
                                            {u.bedrooms ? `${u.bedrooms} BHK` : u.category?.name || '—'}
                                          </span>
                                        </div>
                                        <div className="px-2">
                                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Floor</span>
                                          <span className="block mt-0.5 font-bold text-slate-800 text-xs truncate">
                                            {u.floor ? `Floor ${u.floor}` : '—'}
                                          </span>
                                        </div>
                                        <div className="px-2">
                                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Facing</span>
                                          <span className="block mt-0.5 font-bold text-slate-800 text-xs truncate">
                                            {u.facing || '—'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bottom Row: Stock + View Unit Button */}
                                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                      <div className="flex items-center gap-2">
                                        {isUnitSold ? (
                                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                                            Sold Out
                                          </span>
                                        ) : (
                                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                                            ● {availCount} of {totalCount} in stock
                                          </span>
                                        )}
                                      </div>

                                      <Link
                                        to={`/properties/${u.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                                      >
                                        <span>View Unit Details</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                          <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Showcase Cards for Units with Featured Videos */}
                  {unitsWithVideo.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-100 text-brand-700">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">Unit Video Walkthroughs</h4>
                            <p className="text-[11px] text-slate-500">Recorded video tours for individual property configurations</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-slate-200">
                          {unitsWithVideo.length} Unit Video{unitsWithVideo.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {unitsWithVideo.map((u) => {
                          const img = u.media?.[0]?.url || project.coverImageUrl;
                          return (
                            <div
                              key={u.id}
                              onClick={() => setActiveVideoUnit(u)}
                              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                            >
                              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                                {img && (
                                  <img src={img} alt={u.unitType} className="h-full w-full object-cover transition duration-300 group-hover:scale-105 opacity-85" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/20">
                                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition duration-200 group-hover:scale-110 group-hover:bg-brand-500">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="translate-x-0.5">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> Watch Tour
                                </span>
                                {u.status && (
                                  <span className="absolute top-2 right-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-sm">
                                    {u.status}
                                  </span>
                                )}
                              </div>
                              <div className="p-3">
                                <div className="flex items-baseline justify-between gap-1">
                                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-brand-700 truncate">{u.unitType || u.name}</h4>
                                  <span className="text-xs font-bold text-brand-700 whitespace-nowrap">{inr(u.price)}</span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                                  {[u.category?.name, u.carpetArea ? `${u.carpetArea} ${u.areaUnit || 'sqft'}` : null, u.facing ? `Facing ${u.facing}` : null].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 6. Section: Floor Plans & Master Plan */}
          {hasPlans && (
            <section id="plans" className="scroll-mt-28 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h18v18H3z" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Floor &amp; Master Layout Plans</h2>
                  <p className="text-xs text-slate-500">Architectural master plan and unit configurations</p>
                </div>
              </div>

              {/* Master Plan */}
              {masterPlans.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Master Plan</h3>
                    <span className="text-xs text-slate-400">Click to zoom</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {masterPlans.map((m) => (
                      <figure key={m.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:shadow-md">
                        <button
                          type="button"
                          onClick={() => setLightbox({ src: m.url, alt: m.title || 'Master layout plan' })}
                          className="relative block w-full cursor-zoom-in"
                        >
                          <img src={m.url} alt={m.title || 'Master plan'} className="aspect-[4/3] w-full object-contain p-2" />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                            <span className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-md">
                              ⤢ View Full Plan
                            </span>
                          </span>
                        </button>
                        <figcaption className="border-t border-slate-200 bg-white p-2.5 text-center text-xs font-medium text-slate-700">
                          {m.title || 'Master Plan'}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              {/* Unit Floor Plans */}
              {floorPlans.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Unit Floor Plans</h3>
                    <span className="text-xs text-slate-400">{floorPlans.length} layout{floorPlans.length === 1 ? '' : 's'} available</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {floorPlans.map((m) => (
                      <figure key={m.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:shadow-md">
                        <button
                          type="button"
                          onClick={() => setLightbox({ src: m.url, alt: m.title || 'Floor layout plan' })}
                          className="relative block w-full cursor-zoom-in"
                        >
                          <img src={m.url} alt={m.title || 'Floor plan'} className="aspect-[4/3] w-full object-contain p-2" />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                            <span className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-md">
                              ⤢ View Full Plan
                            </span>
                          </span>
                        </button>
                        <figcaption className="border-t border-slate-200 bg-white p-2.5 text-center text-xs font-medium text-slate-700">
                          {m.title || 'Unit Floor Plan'}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 8. Section: Amenities */}
          {hasAmenities && (
            <section id="amenities" className="scroll-mt-28 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">World-Class Amenities</h2>
                  <p className="text-xs text-slate-500">Lifestyle amenities and recreational facilities included in this project</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {project.amenities.map((a) => (
                  <div
                    key={a.id || a.name}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition hover:border-brand-300 hover:bg-white hover:shadow-sm"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white shadow-xs ring-1 ring-slate-200">
                      <AmenityIcon name={a.name} />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 leading-tight">{a.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 9. Section: Location & Connectivity */}
          <section id="location" className="scroll-mt-28 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Location &amp; Connectivity</h2>
                  <p className="text-xs text-slate-500">Explore neighbourhood, arterial roads, and map location</p>
                </div>
              </div>

              {mapsDirectionsUrl && (
                <div className="flex gap-2">
                  <a
                    href={mapsDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                    Get Directions
                  </a>
                  {mapsSearchUrl && (
                    <a
                      href={mapsSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
                    >
                      Open in Maps
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <MapView
                single
                expandable
                center={project.lat && project.lng ? { lat: project.lat, lng: project.lng } : undefined}
                pins={[project]}
                height={380}
              />
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Project Address: </span>
                {[project.address, project.city, project.state, project.pincode].filter(Boolean).join(', ') || 'Address not listed'}
              </div>
            </div>
          </section>

          {/* 10. Section: In-page Enquiry for mobile/scrolling users */}
          <section id="enquire" className="scroll-mt-28 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Enquire About {project.name}</h2>
                <p className="text-xs text-slate-500">Schedule a site visit, request floor plans, or get custom pricing</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50/70 p-4 sm:p-6">
              <EnquiryForm projectId={project.id} />
            </div>
          </section>
        </div>

        {/* Right Sticky Sidebar (Desktop) */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Direct Developer Connect</span>
              <h3 className="text-lg font-bold text-slate-900">Request Project Details</h3>
              <p className="mt-1 text-xs text-slate-500">Get lowest price offers, brochure, and availability updates</p>
            </div>
            <EnquiryForm projectId={project.id} />

            {project.brochureUrl && (
              <a
                href={project.brochureUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-outline mt-3 flex w-full items-center justify-center gap-2 text-xs font-semibold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Brochure (PDF)
              </a>
            )}
          </div>

          {/* Quick contact helper box */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50/60 to-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Need personalized guidance?</p>
            <p className="mt-1">Our certified property experts can help you compare unit floor plans, evaluate home loan options, and arrange a site visit.</p>
          </div>
        </aside>
      </div>

      {/* Similar Projects Section */}
      {similar.length > 0 && (
        <section className="mt-16 border-t border-slate-200 pt-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Explore Alternatives</span>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Similar {TYPE_LABEL[project.type]} Projects</h2>
              <p className="mt-1 text-sm text-slate-500">Handpicked properties you might also consider</p>
            </div>
            <Link to={`/projects?type=${project.type}`} className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((sp) => (
              <ProjectCard key={sp.id} project={sp} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Floating Bottom Bar */}
      <div className="fixed inset-x-0 bottom-[62px] z-30 flex items-center gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-md lg:hidden shadow-md">
        <FavoriteButton projectId={project.id} className="btn-outline !p-2.5" />
        <button
          type="button"
          className="btn-primary flex-1 py-2.5 text-sm font-bold shadow-md"
          onClick={() => scrollToSection('enquire')}
        >
          Enquire Now
        </button>
      </div>

      {/* Video Modal for Unit Walkthroughs */}
      {activeVideoUnit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setActiveVideoUnit(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 text-white">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>{activeVideoUnit.unitType || activeVideoUnit.name}</span>
                  {activeVideoUnit.category?.name && (
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-300">
                      {activeVideoUnit.category.name}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {[
                    project.name,
                    activeVideoUnit.carpetArea ? `${activeVideoUnit.carpetArea} ${activeVideoUnit.areaUnit || 'sqft'}` : null,
                    activeVideoUnit.price ? inr(activeVideoUnit.price) : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoUnit(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              {videoEmbed(activeVideoUnit.videoUrl)?.type === 'iframe' ? (
                <iframe
                  src={videoEmbed(activeVideoUnit.videoUrl).src}
                  title={activeVideoUnit.unitType}
                  allowFullScreen
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <video
                  key={activeVideoUnit.id || activeVideoUnit.videoUrl}
                  src={videoEmbed(activeVideoUnit.videoUrl)?.src || activeVideoUnit.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  autoPlay
                  className="h-full w-full"
                >
                  <source src={videoEmbed(activeVideoUnit.videoUrl)?.src || activeVideoUnit.videoUrl} type="video/mp4" />
                  Your browser does not support HTML5 video playback.
                </video>
              )}
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-5 py-3 text-xs text-slate-300">
              <span>Status: <strong className="text-emerald-400">{activeVideoUnit.status}</strong></span>
              <Link
                to={`/properties/${activeVideoUnit.id}`}
                className="font-semibold text-brand-400 hover:text-brand-300 hover:underline inline-flex items-center gap-1"
              >
                View Full Unit Details →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for zooming photos, master plans, and floor plans */}
      <ImageLightbox src={lightbox?.src} alt={lightbox?.alt} onClose={() => setLightbox(null)} />
    </div>
  );
}
