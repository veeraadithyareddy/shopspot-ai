import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import PublicHomePage from './pages/PublicHomePage.jsx'
import SearchResultsPage from './pages/SearchResultsPage.jsx'
import RecipeResultsPage from './pages/RecipeResultsPage.jsx'
import SellerAuthPage from './pages/SellerAuthPage.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'

function Root() {
  const { user } = useAuth()
  const [view, setView] = useState('home') // 'home' | 'results' | 'recipeResults' | 'sellerAuth'
  const [searchState, setSearchState] = useState(null)

  // Logged-in sellers always land on their dashboard
  if (user) return <SellerDashboard />

  if (view === 'sellerAuth') {
    return <SellerAuthPage onBack={() => setView('home')} />
  }

  if (view === 'results' && searchState) {
    return (
      <SearchResultsPage
        initialQuery={searchState.query}
        initialLocation={searchState.location}
        onBack={() => setView('home')}
      />
    )
  }

  if (view === 'recipeResults' && searchState) {
    return (
      <RecipeResultsPage
        query={searchState.query}
        location={searchState.location}
        onBack={() => setView('home')}
      />
    )
  }

  return (
    <PublicHomePage
      onSearch={(state) => { setSearchState(state); setView('results') }}
      onRecipeSearch={(state) => { setSearchState(state); setView('recipeResults') }}
      onSellerSignIn={() => setView('sellerAuth')}
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
