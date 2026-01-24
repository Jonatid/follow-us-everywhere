import React, { useState } from 'react';

// ============================================
// MOCK DATA - Multiple Businesses
// ============================================
const mockBusinesses = [
  {
    id: 1,
    name: "CoffeeSpot Detroit",
    slug: "coffeespot",
    tagline: "Detroit's Best Coffee",
    logo: "CD",
    email: "hello@coffeespot.com",
    socials: [
      { platform: "Instagram", url: "https://instagram.com/coffeespot", icon: "📷" },
      { platform: "TikTok", url: "https://tiktok.com/@coffeespot", icon: "🎵" },
      { platform: "YouTube", url: "https://youtube.com/@coffeespot", icon: "▶️" },
      { platform: "Facebook", url: "https://facebook.com/coffeespot", icon: "👍" },
      { platform: "X", url: "https://x.com/coffeespot", icon: "✖️" },
      { platform: "LinkedIn", url: "https://linkedin.com/company/coffeespot", icon: "💼" },
      { platform: "Website", url: "https://coffeespot.com", icon: "🌐" }
    ]
  },
  {
    id: 2,
    name: "Barber Studio NYC",
    slug: "barberstudio",
    tagline: "Classic Cuts, Modern Style",
    logo: "BS",
    email: "info@barberstudio.com",
    socials: [
      { platform: "Instagram", url: "https://instagram.com/barberstudio", icon: "📷" },
      { platform: "TikTok", url: "https://tiktok.com/@barberstudio", icon: "🎵" },
      { platform: "Facebook", url: "https://facebook.com/barberstudio", icon: "👍" },
      { platform: "Website", url: "https://barberstudio.com", icon: "🌐" }
    ]
  }
];

// ============================================
// LANDING PAGE
// ============================================
const LandingPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Follow Us Everywhere
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            One link to connect customers to all your social pages.
          </p>
          <p className="text-gray-500">
            Get your custom link and QR code in minutes.
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => onNavigate('signup')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            Create Your Follow Hub
          </button>
          
          <button
            onClick={() => onNavigate('login')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            Business Login
          </button>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 text-center mb-3">View sample business pages:</p>
            <div className="space-y-2">
              {mockBusinesses.map(business => (
                <button
                  key={business.id}
                  onClick={() => onNavigate('public', business.id)}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 px-4 rounded-lg transition-colors text-left flex items-center justify-between"
                >
                  <span>{business.name}</span>
                  <span className="text-sm text-blue-500">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// BUSINESS SIGNUP
// ============================================
const BusinessSignup = ({ onNavigate, onSignup }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    slug: '',
    tagline: '',
    email: '',
    password: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug from business name
      ...(field === 'businessName' && { slug: value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') })
    }));
  };

  const handleSubmit = () => {
    if (!formData.businessName || !formData.email || !formData.password) {
      alert('Please fill in all required fields');
      return;
    }
    
    const newBusiness = {
      id: Date.now(),
      name: formData.businessName,
      slug: formData.slug,
      tagline: formData.tagline,
      logo: formData.businessName.substring(0, 2).toUpperCase(),
      email: formData.email,
      socials: [
        { platform: "Instagram", url: "", icon: "📷" },
        { platform: "TikTok", url: "", icon: "🎵" },
        { platform: "YouTube", url: "", icon: "▶️" },
        { platform: "Facebook", url: "", icon: "👍" },
        { platform: "X", url: "", icon: "✖️" },
        { platform: "LinkedIn", url: "", icon: "💼" },
        { platform: "Website", url: "", icon: "🌐" }
      ]
    };
    
    onSignup(newBusiness);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <button
          onClick={() => onNavigate('landing')}
          className="text-gray-600 hover:text-gray-700 mb-4 text-sm"
        >
          ← Back
        </button>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Follow Hub</h1>
          <p className="text-gray-600">Get started in under 2 minutes</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Business Name *
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Joe's Coffee Shop"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Your Custom Link
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm mr-2">followuseverywhere.app/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="yourname"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tagline (Optional)
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Best Coffee in Town"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="you@business.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Create a password"
            />
          </div>
          
          <button
            onClick={handleSubmit}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Create Account & Continue
          </button>
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <button onClick={() => onNavigate('login')} className="text-purple-600 hover:text-purple-700 font-semibold">
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

// ============================================
// BUSINESS LOGIN
// ============================================
const BusinessLogin = ({ onNavigate, businesses, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    const business = businesses.find(b => b.email === email);
    
    if (business) {
      onLogin(business);
    } else {
      alert('Business not found. Try hello@coffeespot.com for demo.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <button
          onClick={() => onNavigate('landing')}
          className="text-gray-600 hover:text-gray-700 mb-4 text-sm"
        >
          ← Back
        </button>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Login</h1>
          <p className="text-gray-600">Access your dashboard</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="you@business.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>
          
          <button
            onClick={handleSubmit}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Login
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Demo credentials:</p>
          <p className="text-xs text-gray-500">hello@coffeespot.com</p>
          <p className="text-xs text-gray-500">info@barberstudio.com</p>
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('signup')} className="text-purple-600 hover:text-purple-700 font-semibold">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

// ============================================
// BUSINESS DASHBOARD
// ============================================
const BusinessDashboard = ({ business, onNavigate, onUpdateBusiness }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempUrl, setTempUrl] = useState('');

  const handleCopyLink = () => {
    alert('Link copied to clipboard!');
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setTempUrl(business.socials[index].url);
  };

  const handleSave = (index) => {
    const updatedSocials = [...business.socials];
    updatedSocials[index] = { ...updatedSocials[index], url: tempUrl };
    onUpdateBusiness({ ...business, socials: updatedSocials });
    setEditingIndex(null);
    alert('Link updated!');
  };

  const handleLogout = () => {
    onNavigate('landing');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-700 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{business.name}</h2>
            <p className="text-gray-600">{business.tagline}</p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">Your Follow Us Everywhere link:</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 bg-white px-3 py-2 rounded border text-sm min-w-0">
                https://followuseverywhere.app/{business.slug}
              </code>
              <button
                onClick={handleCopyLink}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-semibold whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          </div>
          
          <button
            onClick={() => onNavigate('public', business.id)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg mb-6"
          >
            Preview Public Follow Page
          </button>
          
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Social Profiles</h2>
          
          <div className="space-y-3">
            {business.socials.map((social, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{social.icon}</span>
                    <span className="font-semibold">{social.platform}</span>
                  </div>
                  <div className="flex gap-2">
                    {editingIndex === index ? (
                      <>
                        <button
                          onClick={() => handleSave(index)}
                          className="text-green-600 hover:text-green-700 text-sm font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-gray-600 hover:text-gray-700 text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEdit(index)}
                        className="text-purple-600 hover:text-purple-700 text-sm font-semibold"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder={`https://${social.platform.toLowerCase()}.com/yourhandle`}
                  />
                ) : (
                  <p className="text-sm text-gray-600 truncate">
                    {social.url || `Add your ${social.platform} link`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PUBLIC FOLLOW PAGE
// ============================================
const PublicFollowPage = ({ business, onNavigate }) => {
  const handlePlatformClick = (platform, url) => {
    if (!url) {
      alert(`${platform} link not configured yet`);
      return;
    }
    console.log(`User clicked ${platform}`);
    window.open(url, '_blank');
  };

  const activeSocials = business.socials.filter(s => s.url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <button
          onClick={() => onNavigate('landing')}
          className="text-gray-600 hover:text-gray-700 mb-4 text-sm"
        >
          ← Back
        </button>
        
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {business.logo}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{business.name}</h1>
          <p className="text-gray-600 mb-4">{business.tagline}</p>
          <p className="text-sm text-gray-500">Follow this business everywhere in two taps.</p>
        </div>
        
        {activeSocials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>This business hasn't added their social links yet.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {business.socials.map((social, index) => 
                social.url ? (
                  <button
                    key={index}
                    onClick={() => handlePlatformClick(social.platform, social.url)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">{social.icon}</span>
                      <span>
                        {social.platform === 'YouTube' ? 'Subscribe on' : 
                         social.platform === 'Facebook' ? 'Like on' :
                         social.platform === 'LinkedIn' ? 'Connect on' :
                         social.platform === 'Website' ? 'Visit' :
                         'Follow on'} {social.platform}
                      </span>
                    </span>
                    <span className="text-gray-400">→</span>
                  </button>
                ) : null
              )}
            </div>
            
            {activeSocials.length > 1 && (
              <button
                onClick={() => onNavigate('progress', business.id)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow-lg transition-all"
              >
                Follow Us Everywhere
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// FOLLOW PROGRESS PAGE
// ============================================
const FollowProgressPage = ({ business, onNavigate }) => {
  const [progress, setProgress] = useState(0);
  const activeSocials = business.socials.filter(s => s.url);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onNavigate('success', business.id);
    }, 2500);

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 1, activeSocials.length));
    }, 350);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onNavigate, activeSocials.length, business.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connecting you to {business.name}...
          </h1>
          <p className="text-gray-600">
            We're opening your apps so you can follow and subscribe.
          </p>
        </div>
        
        <div className="space-y-3">
          {activeSocials.map((social, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                index < progress ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <span className="text-2xl">{social.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{social.platform}</p>
                <p className="text-sm text-gray-600">
                  {index < progress ? 'Opened!' : 'Opening profile...'}
                </p>
              </div>
              {index < progress && <span className="text-green-600 text-xl">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// FOLLOW SUCCESS PAGE
// ============================================
const FollowSuccessPage = ({ business, onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white text-5xl mx-auto mb-6">
          ✓
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Success!</h1>
        
        <p className="text-lg text-gray-600 mb-8">
          You're now connected to <span className="font-semibold">{business.name}</span> on the platforms you chose.
        </p>
        
        <button
          onClick={() => onNavigate('public', business.id)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Back to Follow Page
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [businesses, setBusinesses] = useState(mockBusinesses);
  const [currentBusinessId, setCurrentBusinessId] = useState(null);

  const handleNavigate = (screen, businessId = null) => {
    setCurrentScreen(screen);
    if (businessId !== null) {
      setCurrentBusinessId(businessId);
    }
  };

  const handleSignup = (newBusiness) => {
    setBusinesses(prev => [...prev, newBusiness]);
    setCurrentBusinessId(newBusiness.id);
    setCurrentScreen('dashboard');
    alert('Account created successfully! Add your social links to get started.');
  };

  const handleLogin = (business) => {
    setCurrentBusinessId(business.id);
    setCurrentScreen('dashboard');
  };

  const handleUpdateBusiness = (updatedBusiness) => {
    setBusinesses(prev => 
      prev.map(b => b.id === updatedBusiness.id ? updatedBusiness : b)
    );
  };

  const currentBusiness = businesses.find(b => b.id === currentBusinessId);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'signup':
        return <BusinessSignup onNavigate={handleNavigate} onSignup={handleSignup} />;
      case 'login':
        return <BusinessLogin onNavigate={handleNavigate} businesses={businesses} onLogin={handleLogin} />;
      case 'dashboard':
        return currentBusiness ? (
          <BusinessDashboard 
            business={currentBusiness} 
            onNavigate={handleNavigate}
            onUpdateBusiness={handleUpdateBusiness}
          />
        ) : <LandingPage onNavigate={handleNavigate} />;
      case 'public':
        return currentBusiness ? (
          <PublicFollowPage business={currentBusiness} onNavigate={handleNavigate} />
        ) : <LandingPage onNavigate={handleNavigate} />;
      case 'progress':
        return currentBusiness ? (
          <FollowProgressPage business={currentBusiness} onNavigate={handleNavigate} />
        ) : <LandingPage onNavigate={handleNavigate} />;
      case 'success':
        return currentBusiness ? (
          <FollowSuccessPage business={currentBusiness} onNavigate={handleNavigate} />
        ) : <LandingPage onNavigate={handleNavigate} />;
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return <div>{renderScreen()}</div>;
}