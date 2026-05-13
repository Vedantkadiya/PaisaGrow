import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './Learn.css';

// ─── LESSON DATA ─────────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: 'share', icon: '🧩', title: 'What is a Share?', badge: 'Basics', badgeColor: 'var(--green)', xp: 50,
    content: [
      { type: 'text', text: 'When a company needs money to grow, it divides itself into thousands of tiny pieces called **shares** (also called stocks). When you buy a share, you become a part-owner of that company!' },
      { type: 'example', title: '🍕 Pizza Example', text: 'Imagine a pizza cut into 100 slices. If you buy 10 slices, you own 10% of the pizza. If the pizza shop earns more money, your 10 slices become more valuable!' },
      { type: 'fact', text: 'A single share of Suzlon Energy costs just ₹42. That means you can become a part-owner of a wind energy company for less than the price of a cup of chai!' },
    ],
    quiz: [
      { q: 'What do you become when you buy a share of a company?', options: ['A lender', 'A part-owner', 'An employee', 'A customer'], answer: 1 },
      { q: 'If a pizza is cut into 100 slices and you buy 10, what % do you own?', options: ['5%', '20%', '10%', '1%'], answer: 2 },
      { q: 'What are shares also called?', options: ['Bonds', 'Loans', 'Stocks', 'Dividends'], answer: 2 },
    ]
  },
  {
    id: 'market', icon: '🏪', title: 'How Does the Stock Market Work?', badge: 'Basics', badgeColor: 'var(--green)', xp: 50,
    content: [
      { type: 'text', text: 'The stock market is like a giant bazaar where people buy and sell shares every day. In India, the two main stock exchanges are **NSE** (National Stock Exchange) and **BSE** (Bombay Stock Exchange).' },
      { type: 'example', title: '📊 How Prices Move', text: 'If many people want to buy Tata Motors shares, the price goes UP. If many want to sell, the price goes DOWN. Simple supply and demand — just like prices in a vegetable market!' },
      { type: 'fact', text: 'The Nifty 50 is an index of India\'s top 50 companies. When people say "the market is up," they usually mean the Nifty 50 index went up!' },
    ],
    quiz: [
      { q: 'What are the two main stock exchanges in India?', options: ['NYSE & NASDAQ', 'NSE & BSE', 'MCX & CDSL', 'RBI & SEBI'], answer: 1 },
      { q: 'When many people want to BUY a stock, what happens to its price?', options: ['It goes down', 'It stays same', 'It goes up', 'It disappears'], answer: 2 },
      { q: 'Nifty 50 tracks how many companies?', options: ['100', '30', '500', '50'], answer: 3 },
    ]
  },
  {
    id: 'risk', icon: '⚠️', title: 'Understanding Risk', badge: 'Important', badgeColor: 'var(--yellow)', xp: 60,
    content: [
      { type: 'text', text: 'Risk means the chance that your investment might lose value. **Higher risk = higher potential reward, but also higher chance of loss.** Every investment has some risk!' },
      { type: 'list', title: '3 Risk Levels:', items: ['🟢 LOW RISK — Government-backed stocks (NTPC, IRFC), ETFs. Good for beginners.', '🟡 MEDIUM RISK — Private banks, big companies (Tata, Wipro). Can go up or down 10-25%/year.', '🔴 HIGH RISK — Smaller companies, speculative stocks. Can double or halve quickly!'] },
      { type: 'fact', text: 'Golden Rule: Never invest money you cannot afford to lose. Keep 3-6 months of expenses as emergency savings BEFORE investing!' },
    ],
    quiz: [
      { q: 'Higher risk investments offer...', options: ['Lower returns only', 'No returns', 'Higher potential reward AND higher chance of loss', 'Guaranteed returns'], answer: 2 },
      { q: 'Which is considered LOW RISK?', options: ['New startup stock', 'Penny stocks', 'NTPC or ETFs', 'Crypto'], answer: 2 },
      { q: 'How many months of expenses should you save BEFORE investing?', options: ['1 month', '10 months', '3-6 months', '24 months'], answer: 2 },
    ]
  },
  {
    id: 'sip', icon: '📅', title: 'SIP — Your Best Friend!', badge: 'Strategy', badgeColor: 'var(--blue)', xp: 70,
    content: [
      { type: 'text', text: '**SIP (Systematic Investment Plan)** means investing a fixed amount every month, no matter what the market does. It\'s the #1 recommended strategy for beginners!' },
      { type: 'example', title: '🪣 The Bucket Strategy', text: 'Imagine filling a bucket with a mug of water every day. Even if some water splashes out (market falls), you keep adding more. Over time the bucket fills — and you bought more when prices were low!' },
      { type: 'list', title: 'Why SIP is Amazing:', items: ['✅ Start with just ₹100/month', '✅ Removes emotion from investing (no FOMO, no panic)', '✅ Rupee-cost averaging: you buy more when prices are low', '✅ Builds discipline and savings habits'] },
    ],
    quiz: [
      { q: 'SIP stands for...', options: ['Savings Interest Plan', 'Systematic Investment Plan', 'Stock Index Portfolio', 'Safe Income Plan'], answer: 1 },
      { q: 'What is the minimum SIP amount in mutual funds?', options: ['₹10,000', '₹1,000', '₹5,000', '₹100'], answer: 3 },
      { q: 'Rupee-cost averaging means you buy MORE units when prices are...', options: ['High', 'Low', 'Stable', 'Falling only'], answer: 1 },
    ]
  },
  {
    id: 'etf', icon: '📦', title: 'ETF — Instant Diversification!', badge: 'Smart Move', badgeColor: 'var(--green)', xp: 70,
    content: [
      { type: 'text', text: 'An **ETF (Exchange Traded Fund)** is like a basket of stocks. Instead of buying one company, you buy a tiny piece of many companies at once! **Nifty BeES** ETF gives you exposure to India\'s top 50 companies in one purchase.' },
      { type: 'example', title: '🧺 Shopping Basket Example', text: 'Instead of betting all your money on one vegetable (one stock), an ETF is like buying a whole basket. If one spoils, the others keep your basket valuable!' },
      { type: 'fact', text: 'Warren Buffett recommends index funds for most regular investors! He says it\'s better than trying to pick individual stocks.' },
    ],
    quiz: [
      { q: 'ETF stands for...', options: ['Equity Transfer Fund', 'Exchange Traded Fund', 'Earnings Tax Fund', 'Extended Term Finance'], answer: 1 },
      { q: 'Nifty BeES ETF gives you exposure to how many companies?', options: ['10', '500', '50', '100'], answer: 2 },
      { q: 'What is the main benefit of an ETF?', options: ['High risk', 'Instant diversification', 'Guaranteed profit', 'No taxes'], answer: 1 },
    ]
  },
  {
    id: 'compound', icon: '🌊', title: 'Compound Interest — The 8th Wonder!', badge: 'Wealth Secret', badgeColor: 'var(--orange)', xp: 80,
    content: [
      { type: 'text', text: 'Albert Einstein called compound interest the **"8th wonder of the world."** It means earning returns on your returns — your money grows on itself!' },
      { type: 'table', title: '₹1,000 invested at 14% return:', rows: [['After 1 year', '₹1,140', '+₹140'], ['After 5 years', '₹1,925', '+₹925'], ['After 10 years', '₹3,707', '+₹2,707'], ['After 20 years', '₹13,743', '+₹12,743'], ['After 30 years', '₹50,950', '+₹49,950']] },
      { type: 'fact', text: '₹1,000 becomes ₹50,000 in 30 years without adding a single rupee more! This is why starting early is so powerful.' },
    ],
    quiz: [
      { q: 'Who called compound interest the "8th wonder of the world"?', options: ['Warren Buffett', 'Rakesh Jhunjhunwala', 'Albert Einstein', 'Isaac Newton'], answer: 2 },
      { q: '₹1,000 at 14% for 30 years becomes approximately...', options: ['₹5,000', '₹10,000', '₹50,950', '₹1,14,000'], answer: 2 },
      { q: 'Compound interest means earning returns on your...', options: ['Salary only', 'Savings account only', 'Returns themselves', 'Tax refund'], answer: 2 },
    ]
  },
  {
    id: 'mistakes', icon: '🚫', title: 'Mistakes to Avoid', badge: 'Warning', badgeColor: 'var(--red)', xp: 60,
    content: [
      { type: 'list', title: '5 Common Beginner Mistakes:', items: ['❌ Investing money you need soon (only invest for 3+ years)', '❌ Putting all money in one stock (diversify across 5-10)', '❌ Panic selling when prices fall (falls are NORMAL)', '❌ Following tips from WhatsApp groups (do your own research!)', '❌ No emergency fund first (save 3-6 months expenses)'] },
      { type: 'example', title: '📉 The Panic Selling Trap', text: 'You buy at ₹100. Falls to ₹80. You panic and sell. Then it rises to ₹150. You lost ₹20 AND missed the ₹50 gain! Markets always recover in the long term.' },
      { type: 'fact', text: 'The Nifty 50 has NEVER given negative returns over any 7-year period in history!' },
    ],
    quiz: [
      { q: 'You should only invest money you won\'t need for at least...', options: ['1 week', '6 months', '3 years', '10 years only'], answer: 2 },
      { q: 'What should you do when the market falls?', options: ['Sell everything immediately', 'Stay calm and stay invested', 'Borrow money to buy more', 'Switch to crypto'], answer: 1 },
      { q: 'Spreading money across multiple stocks is called...', options: ['Gambling', 'Diversification', 'Speculation', 'Hedging'], answer: 1 },
    ]
  },
  {
    id: 'taxes', icon: '🏛️', title: 'Taxes on Stock Profits', badge: 'Must Know', badgeColor: 'var(--yellow)', xp: 70,
    content: [
      { type: 'text', text: 'When you make profit from stocks, you may need to pay tax. Here\'s a simple guide:' },
      { type: 'list', title: 'Indian Stock Tax Rules (2024):', items: ['📌 STCG — Sold within 1 year: Pay 20% tax on profit', '📌 LTCG — Held for 1+ year: First ₹1.25 lakh profit per year is TAX FREE! Above that: 12.5%', '📌 Dividends — Taxed as per your income slab', '📌 Losses — Offset losses against gains to reduce tax'] },
      { type: 'fact', text: 'Hold stocks for more than 1 year to get LTCG benefit. The first ₹1.25 lakh profit every year is completely tax-free!' },
    ],
    quiz: [
      { q: 'STCG applies when you sell within...', options: ['3 years', '2 years', '6 months', '1 year'], answer: 3 },
      { q: 'LTCG tax rate above ₹1.25 lakh is...', options: ['30%', '20%', '12.5%', '5%'], answer: 2 },
      { q: 'Up to how much LTCG profit per year is tax-free?', options: ['₹50,000', '₹1 lakh', '₹1.25 lakh', '₹2 lakh'], answer: 2 },
    ]
  },
  // ─── NEW LESSONS ──────────────────────────────────────────────────────────
  {
    id: 'mutual_funds', icon: '🏦', title: 'Mutual Funds Explained', badge: 'New', badgeColor: 'var(--teal)', xp: 80,
    content: [
      { type: 'text', text: 'A **Mutual Fund** pools money from thousands of investors and a professional fund manager invests it in stocks, bonds, or both. You don\'t need to pick stocks yourself — the expert does it for you!' },
      { type: 'example', title: '👨‍🍳 The Chef Analogy', text: 'Instead of cooking yourself (picking stocks), you pay a professional chef (fund manager) to cook the best meal (portfolio) using everyone\'s ingredients (pooled money).' },
      { type: 'list', title: 'Types of Mutual Funds:', items: ['📈 Equity Funds — Invest in stocks. High growth, higher risk.', '🏛️ Debt Funds — Bonds/FDs. Stable but lower returns.', '⚖️ Hybrid Funds — Mix of equity + debt. Balanced risk.', '📊 Index Funds — Track Nifty 50 or Sensex. Low cost, great for beginners!'] },
      { type: 'fact', text: 'India has over 44 crore mutual fund folios! Mutual funds are regulated by SEBI, making them one of the safest investment vehicles.' },
    ],
    quiz: [
      { q: 'Who manages the money in a Mutual Fund?', options: ['You yourself', 'The government', 'A professional fund manager', 'Your bank'], answer: 2 },
      { q: 'Which mutual fund type is best for beginners?', options: ['Small-cap equity', 'Sector funds', 'Penny stock funds', 'Index funds'], answer: 3 },
      { q: 'Mutual funds in India are regulated by...', options: ['RBI', 'SEBI', 'Finance Ministry', 'NSE'], answer: 1 },
    ]
  },
  {
    id: 'dividends', icon: '💸', title: 'Dividends — Getting Paid to Hold!', badge: 'New', badgeColor: 'var(--teal)', xp: 75,
    content: [
      { type: 'text', text: 'A **dividend** is a portion of a company\'s profits paid directly to shareholders. When a company earns well, it may share some of that profit with you — just for holding the stock! This creates **passive income** from your investments.' },
      { type: 'example', title: '🏠 Rental Income Comparison', text: 'Think of it like renting out a flat you own. The flat\'s value might go up or down (capital gain/loss), but you also receive monthly rent (dividend). Even if prices fall, the rent still arrives!' },
      { type: 'table', title: 'High Dividend Stocks in India (Examples):', rows: [['Coal India', '~₹24/share/year', '~6% yield'], ['ONGC', '~₹8/share/year', '~4% yield'], ['Power Grid', '~₹10/share/year', '~4.5% yield']] },
      { type: 'fact', text: 'DRIP (Dividend Reinvestment Plan) — Automatically reinvesting dividends to buy more shares creates a powerful compounding effect over time!' },
    ],
    quiz: [
      { q: 'A dividend is...', options: ['A loss on your investment', 'A loan from the company', 'A share of company profits paid to shareholders', 'A government tax'], answer: 2 },
      { q: 'Dividend yield = Annual dividend ÷ stock price × 100. A ₹5 dividend on a ₹100 stock = ?', options: ['1%', '5%', '10%', '0.5%'], answer: 1 },
      { q: 'DRIP stands for...', options: ['Dividend Ratio Investment Plan', 'Direct Return Income Portfolio', 'Dividend Reinvestment Plan', 'Diversified Risk Income Plan'], answer: 2 },
    ]
  },
  {
    id: 'ipo', icon: '🚀', title: 'IPO — When Companies Go Public', badge: 'New', badgeColor: 'var(--teal)', xp: 85,
    content: [
      { type: 'text', text: 'An **IPO (Initial Public Offering)** is when a private company sells its shares to the public for the first time. It\'s the company\'s debut on the stock market! Investors can apply to buy shares at the IPO price before trading begins.' },
      { type: 'example', title: '🎬 Movie Premiere Analogy', text: 'An IPO is like the grand premiere of a movie. Everyone is excited, early tickets (shares) might be in high demand, and the price could jump on opening day. But just like movies, some are blockbusters and some flop!' },
      { type: 'list', title: 'IPO Process in India:', items: ['1️⃣ Company files Draft Red Herring Prospectus (DRHP) with SEBI', '2️⃣ IPO subscription window opens (usually 3 days)', '3️⃣ You apply through your broker/UPI with bids in "lots"', '4️⃣ Allotment — shares given to applicants (lottery if oversubscribed)', '5️⃣ Listing day — shares start trading on NSE/BSE'] },
      { type: 'fact', text: 'Zomato IPO (2021) was subscribed 38 times! That means 38x more people wanted shares than were available. Winners are chosen by lottery.' },
    ],
    quiz: [
      { q: 'IPO stands for...', options: ['International Portfolio Offering', 'Initial Public Offering', 'Indian Private Organization', 'Index Price Option'], answer: 1 },
      { q: 'In India, IPO applications are submitted in units called...', options: ['Shares', 'Lots', 'Bonds', 'Units'], answer: 1 },
      { q: 'DRHP is filed with which body?', options: ['RBI', 'Income Tax Dept', 'SEBI', 'NSE'], answer: 2 },
    ]
  },
  {
    id: 'diversification', icon: '🌈', title: 'Diversification — Don\'t Put All Eggs in One Basket', badge: 'New', badgeColor: 'var(--teal)', xp: 75,
    content: [
      { type: 'text', text: '**Diversification** means spreading your money across different investments so that a loss in one area doesn\'t destroy your entire portfolio. It is the single most powerful risk-reduction strategy available to investors.' },
      { type: 'list', title: 'How to Diversify:', items: ['🏢 Across Sectors — IT, Banking, Healthcare, Energy, FMCG', '🌍 Across Geographies — Indian + international exposure via funds', '📊 Across Asset Classes — Stocks + Gold + Debt + REITs', '⏰ Across Time — Invest monthly via SIP rather than all at once'] },
      { type: 'example', title: '🥚 The Egg Basket Rule', text: 'If you put all 10 eggs in one basket and it falls — 0 eggs. If you spread across 5 baskets and one falls — you still have 8 eggs! A diversified portfolio works the same way.' },
      { type: 'fact', text: 'Modern Portfolio Theory by Harry Markowitz (Nobel Prize winner) mathematically proved that diversification reduces risk without necessarily reducing returns!' },
    ],
    quiz: [
      { q: 'Diversification primarily helps with...', options: ['Maximizing returns', 'Reducing risk', 'Beating inflation', 'Paying less tax'], answer: 1 },
      { q: 'Which of these is NOT a diversification strategy?', options: ['Investing in multiple sectors', 'Putting all money in one "safe" stock', 'SIP investing over time', 'Mixing stocks and gold'], answer: 1 },
      { q: 'Harry Markowitz won the Nobel Prize for...', options: ['Tax theory', 'Accounting rules', 'Modern Portfolio Theory', 'Currency hedging'], answer: 2 },
    ]
  },
  {
    id: 'financial_statements', icon: '📋', title: 'Reading Financial Statements', badge: 'Advanced', badgeColor: 'var(--orange)', xp: 100,
    content: [
      { type: 'text', text: 'Before buying a stock, smart investors look at 3 key financial statements: **Balance Sheet**, **Income Statement (P&L)**, and **Cash Flow Statement**. Together they tell you if a company is healthy and profitable.' },
      { type: 'list', title: '3 Key Statements:', items: ['📊 Balance Sheet — What a company OWNS (assets) vs what it OWES (liabilities). Assets − Liabilities = Shareholders\' Equity.', '💰 Income Statement (P&L) — Revenue vs Expenses = Profit/Loss. Look for growing revenue & improving margins.', '💧 Cash Flow Statement — Actual cash in and out. A profitable company can still go bankrupt if it runs out of cash!'] },
      { type: 'list', title: 'Key Ratios to Know:', items: ['📈 P/E Ratio — Price-to-Earnings. Higher = expensive. Compare within same sector.', '📊 ROE — Return on Equity. 15%+ is good.', '💰 Debt-to-Equity — Lower is safer. Under 1 is ideal.', '📉 EPS — Earnings per Share. Growing EPS = growing profitability.'] },
      { type: 'fact', text: 'All financial statements of Indian listed companies are FREE on BSE/NSE website, Screener.in, or Moneycontrol. Always read the Annual Report!' },
    ],
    quiz: [
      { q: 'Which statement shows what a company OWNS and OWES?', options: ['Income Statement', 'Cash Flow Statement', 'Balance Sheet', 'Annual Report'], answer: 2 },
      { q: 'P/E Ratio stands for...', options: ['Profit & Equity', 'Price-to-Earnings', 'Portfolio Efficiency', 'Payment & Exchange'], answer: 1 },
      { q: 'A good Debt-to-Equity ratio is ideally...', options: ['Above 5', 'Exactly 2', 'Under 1', 'Negative'], answer: 2 },
    ]
  },
  {
    id: 'demat', icon: '🗂️', title: 'Demat & Trading Account Setup', badge: 'Getting Started', badgeColor: 'var(--blue)', xp: 65,
    content: [
      { type: 'text', text: 'To invest in stocks in India, you need two accounts: a **Demat Account** (stores your shares electronically, like a digital locker) and a **Trading Account** (used to place buy/sell orders). Most brokers open both together.' },
      { type: 'list', title: 'Top Discount Brokers in India:', items: ['🥇 Zerodha — Largest broker, ₹0 equity delivery, great for beginners', '🥈 Groww — Super beginner-friendly app, free delivery trades', '🥉 Upstox — Low cost, good for active traders', '💼 Angel One — Full-service + discount, good research tools'] },
      { type: 'list', title: 'Documents Needed to Open Account:', items: ['📋 PAN Card (mandatory)', '🪪 Aadhaar Card for KYC', '🏦 Bank account with cancelled cheque', '📸 Passport-size photo', '✍️ Signature (digital or physical)'] },
      { type: 'fact', text: 'You can open a Demat + Trading account online in 15 minutes! Most brokers have zero account opening charges. Annual maintenance is typically ₹300-500/year.' },
    ],
    quiz: [
      { q: 'A Demat account is used to...', options: ['Place buy/sell orders', 'Store your shares electronically', 'Pay taxes on profits', 'Receive dividends only'], answer: 1 },
      { q: 'Which document is MANDATORY to open a Demat account?', options: ['Passport', 'Voter ID', 'PAN Card', 'Driving License'], answer: 2 },
      { q: 'How long does it typically take to open a Demat account online?', options: ['1 month', '1 week', '15 minutes', '3 days'], answer: 2 },
    ]
  },
];

// ─── BADGES ─────────────────────────────────────────────────────────────────
const BADGES = [
  { id: 'first_lesson', icon: '🌱', label: 'First Steps', desc: 'Complete your first quiz', req: (c) => c >= 1 },
  { id: 'five_lessons', icon: '⚡', label: 'On a Roll', desc: 'Complete 5 quizzes', req: (c) => c >= 5 },
  { id: 'halfway', icon: '🎯', label: 'Halfway There', desc: 'Complete 7 lessons', req: (c) => c >= 7 },
  { id: 'all_done', icon: '🏆', label: 'Scholar', desc: 'Complete all lessons', req: (c) => c >= LESSONS.length },
  { id: 'xp_500', icon: '💎', label: 'XP Hunter', desc: 'Earn 500+ XP', req: (c, xp) => xp >= 500 },
  { id: 'xp_1000', icon: '👑', label: 'Master Investor', desc: 'Earn 1000+ XP', req: (c, xp) => xp >= 1000 },
];

// ─── QUIZ ─────────────────────────────────────────────────────────────────
function Quiz({ quiz, lessonId, onComplete, alreadyDone }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  if (alreadyDone) {
    return (
      <div className="quiz-done-banner">
        <span style={{fontSize:26}}>🏆</span>
        <div><div style={{fontWeight:700}}>Quiz Completed!</div><div style={{color:'var(--teal)',fontSize:13}}>XP already earned for this lesson</div></div>
      </div>
    );
  }

  const q = quiz[current];

  const handleSelect = (idx) => {
    if (selected !== null) return;
    const correct = idx === q.answer;
    setSelected(idx);
    if (correct) setScore(s => s + 1);
    setTimeout(() => setShowFeedback(true), 350);
  };

  const handleNext = () => {
    const wasCorrect = selected === q.answer;
    setShowFeedback(false);
    setSelected(null);
    if (current + 1 < quiz.length) {
      setCurrent(c => c + 1);
    } else {
      setDone(true);
      onComplete(score + (wasCorrect ? 1 : 0));
    }
  };

  if (done) {
    const finalScore = score;
    const pct = Math.round((finalScore / quiz.length) * 100);
    return (
      <div className="quiz-result animate-in">
        <div className="quiz-result-emoji">{pct === 100 ? '🏆' : pct >= 67 ? '🎉' : '📖'}</div>
        <div className="quiz-result-title">{pct === 100 ? 'Perfect Score!' : pct >= 67 ? 'Well Done!' : 'Keep Learning!'}</div>
        <div className="quiz-result-score">{finalScore}/{quiz.length} correct — {pct}%</div>
        <div className="quiz-result-sub">{pct === 100 ? 'You nailed every question!' : pct >= 67 ? 'Great understanding!' : 'Review the lesson and try again next time.'}</div>
      </div>
    );
  }

  return (
    <div className="quiz-wrap animate-in">
      <div className="quiz-header">
        <span className="quiz-label">🧠 Quiz — Question {current + 1} of {quiz.length}</span>
        <div className="quiz-progress-dots">
          {quiz.map((_, i) => <span key={i} className={`quiz-dot ${i < current ? 'done' : i === current ? 'current' : ''}`} />)}
        </div>
      </div>
      <div className="quiz-question">{q.q}</div>
      <div className="quiz-options">
        {q.options.map((opt, i) => {
          let cls = 'quiz-opt';
          if (selected !== null) {
            if (i === q.answer) cls += ' correct';
            else if (i === selected && selected !== q.answer) cls += ' wrong';
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={selected !== null}>
              <span className="quiz-opt-letter">{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {showFeedback && (
        <div className={`quiz-feedback ${selected === q.answer ? 'correct' : 'wrong'}`}>
          <span>{selected === q.answer ? '✅ Correct!' : `❌ Correct: ${q.options[q.answer]}`}</span>
          <button className="quiz-next-btn" onClick={handleNext}>
            {current + 1 < quiz.length ? 'Next →' : 'See Results'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── LESSON CONTENT ─────────────────────────────────────────────────────────
function LessonContent({ content }) {
  return (
    <div className="lesson-content">
      {content.map((item, i) => {
        if (item.type === 'text') return (
          <p key={i} className="lc-text" dangerouslySetInnerHTML={{ __html: safeBold(item.text) }} />
        );
        if (item.type === 'example') return (
          <div key={i} className="lc-example">
            <div className="lc-example-title">{item.title}</div>
            <div className="lc-example-body">{item.text}</div>
          </div>
        );
        if (item.type === 'fact') return (
          <div key={i} className="lc-fact">
            <span className="lc-fact-icon">💎</span>
            <span>{item.text}</span>
          </div>
        );
        if (item.type === 'list') return (
          <div key={i} className="lc-list">
            {item.title && <div className="lc-list-title">{item.title}</div>}
            <ul>{item.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
          </div>
        );
        if (item.type === 'table') return (
          <div key={i} className="lc-table-wrap">
            {item.title && <div className="lc-list-title">{item.title}</div>}
            <table className="lc-table">
              <tbody>
                {item.rows.map((row, j) => (
                  <tr key={j}>{row.map((cell, k) => <td key={k} style={k === 2 ? { color: 'var(--green)', fontWeight: 700 } : {}}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        return null;
      })}
    </div>
  );
}

function safeBold(text) {
  if (typeof text !== 'string') return '';
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function Learn({ userId }) {
  const [active, setActive] = useState('share');
  const [tab, setTab] = useState('lesson');
  const [completedQuizzes, setCompletedQuizzes] = useLocalStorage('learn_quizzes', {}, userId);
  const [totalXP, setTotalXP] = useLocalStorage('learn_xp', 0, userId);
  const [badgeAnim, setBadgeAnim] = useState(null);

  const lesson = LESSONS.find(l => l.id === active);
  const completedCount = Object.keys(completedQuizzes).length;
  const level = Math.floor(totalXP / 200) + 1;
  const xpInLevel = totalXP % 200;
  const earnedBadges = BADGES.filter(b => b.req(completedCount, totalXP));

  const handleQuizComplete = (score) => {
    if (completedQuizzes[active]) return;
    const xpEarned = Math.round(lesson.xp * (score / lesson.quiz.length));
    const newQuizzes = { ...completedQuizzes, [active]: { score, total: lesson.quiz.length, xpEarned } };
    setCompletedQuizzes(newQuizzes);
    setTotalXP(x => x + xpEarned);
    // Badge check
    const newCount = Object.keys(newQuizzes).length;
    const newXP = totalXP + xpEarned;
    for (const b of BADGES) {
      if (b.req(newCount, newXP) && !earnedBadges.find(eb => eb.id === b.id)) {
        setBadgeAnim(b);
        setTimeout(() => setBadgeAnim(null), 3500);
        break;
      }
    }
  };

  return (
    <div className="learn-page animate-in">
      {badgeAnim && (
        <div className="badge-anim animate-in">
          <span style={{ fontSize: 32 }}>{badgeAnim.icon}</span>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>Badge Earned! 🎉</div><div style={{ color: 'var(--gold)', fontWeight: 700 }}>{badgeAnim.label}</div></div>
        </div>
      )}

      <h1 className="page-title">📚 Learn the Basics</h1>
      <p className="page-sub">Simple, jargon-free guides to help you invest confidently</p>

      {/* XP Bar */}
      <div className="learn-xp-bar card">
        <div className="xp-info">
          <div className="xp-level">⭐ Level {level}</div>
          <div className="xp-count">{totalXP} XP total</div>
          <div className="xp-lessons">{completedCount}/{LESSONS.length} lessons done</div>
        </div>
        <div className="xp-bar-wrap">
          <div className="xp-bar-bg">
            <div className="xp-bar-fill" style={{ width: `${Math.min(100, (xpInLevel / 200) * 100)}%` }} />
          </div>
          <div className="xp-bar-label">{xpInLevel}/200 XP → Level {level + 1}</div>
        </div>
        <div className="xp-badges">
          {BADGES.map(b => (
            <div key={b.id} className={`xp-badge-chip ${earnedBadges.find(eb => eb.id === b.id) ? 'earned' : 'locked'}`} title={b.desc}>
              <span>{b.icon}</span><span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="learn-layout">
        {/* Lesson Nav */}
        <nav className="lesson-nav">
          {LESSONS.map(l => {
            const done = !!completedQuizzes[l.id];
            return (
              <button key={l.id}
                className={`lesson-nav-item ${active === l.id ? 'active' : ''}`}
                onClick={() => { setActive(l.id); setTab('lesson'); }}>
                <span className="lni-icon">{l.icon}</span>
                <span className="lni-text">
                  <span className="lni-title">{l.title}</span>
                  <span className="lni-badge" style={{ color: l.badgeColor }}>{l.badge}</span>
                </span>
                {done
                  ? <span className="lni-check">✓</span>
                  : <span className="lni-xp">+{l.xp}</span>
                }
              </button>
            );
          })}
        </nav>

        {/* Content */}
        {lesson && (
          <div className="lesson-body card animate-in" key={lesson.id}>
            <div className="lesson-header">
              <span className="lesson-icon">{lesson.icon}</span>
              <div style={{ flex: 1 }}>
                <h2 className="lesson-title">{lesson.title}</h2>
                <span className="lesson-badge-pill" style={{ color: lesson.badgeColor, borderColor: lesson.badgeColor }}>{lesson.badge}</span>
              </div>
              <div className="lesson-xp-pill">+{lesson.xp} XP</div>
            </div>

            <div className="lesson-tabs">
              <button className={`ltab ${tab === 'lesson' ? 'active' : ''}`} onClick={() => setTab('lesson')}>📖 Lesson</button>
              <button className={`ltab ${tab === 'quiz' ? 'active' : ''}`} onClick={() => setTab('quiz')}>
                🧠 Quiz {completedQuizzes[lesson.id] ? <span className="ltab-done">✓</span> : null}
              </button>
            </div>

            {tab === 'lesson' ? (
              <>
                <LessonContent content={lesson.content} />
                <div className="lesson-nav-btns">
                  {LESSONS.findIndex(l => l.id === active) > 0 && (
                    <button className="btn btn-secondary" onClick={() => { setActive(LESSONS[LESSONS.findIndex(l => l.id === active) - 1].id); setTab('lesson'); }}>← Previous</button>
                  )}
                  <button className="btn btn-primary" onClick={() => setTab('quiz')} style={{ marginLeft: 'auto' }}>Take Quiz →</button>
                  {LESSONS.findIndex(l => l.id === active) < LESSONS.length - 1 && (
                    <button className="btn btn-secondary" onClick={() => { setActive(LESSONS[LESSONS.findIndex(l => l.id === active) + 1].id); setTab('lesson'); }}>Next →</button>
                  )}
                </div>
              </>
            ) : (
              <Quiz quiz={lesson.quiz} lessonId={lesson.id} onComplete={handleQuizComplete} alreadyDone={!!completedQuizzes[lesson.id]} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
