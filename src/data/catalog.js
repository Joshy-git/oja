// Mock catalog for the Oja prototype. In production this comes from the
// NestJS catalog API; shapes mirror the PRD's core data domains.

export const CATEGORIES = [
  { id: 'electronics', name: 'Electronics & Phone', icon: 'Smartphone', hue: 210 },
  { id: 'home', name: 'Home & Kitchen', icon: 'CookingPot', hue: 28 },
  { id: 'men', name: "Men's Fashion", icon: 'Shirt', hue: 215 },
  { id: 'women', name: "Women's Fashion", icon: 'Gem', hue: 330 },
  { id: 'kids', name: "Kids' Fashion", icon: 'Backpack', hue: 40 },
  { id: 'kiddies', name: 'Kiddies (0–3 yrs)', icon: 'Baby', hue: 190 },
  { id: 'beauty', name: 'Beauty & Care', icon: 'Sparkles', hue: 350 },
  { id: 'fitness', name: 'Health & Fitness', icon: 'Dumbbell', hue: 150 },
  { id: 'auto', name: 'Automotive', icon: 'Car', hue: 0 },
  { id: 'tools', name: 'Tools & DIY', icon: 'Wrench', hue: 45 },
  { id: 'toys', name: 'Toys & Games', icon: 'ToyBrick', hue: 280 },
  { id: 'office', name: 'Office & School', icon: 'PencilRuler', hue: 190 },
  { id: 'travel', name: 'Travel & Lifestyle', icon: 'Luggage', hue: 170 },
  { id: 'pet', name: 'Pet Supplies', icon: 'PawPrint', hue: 95 },
]

// Inventory states from PRD §10
export const STOCK = {
  nigeria: { label: 'In stock in Nigeria', short: 'Ships from Lagos', tone: 'good' },
  transit: { label: 'Arriving in Nigeria soon', short: 'In transit', tone: 'info' },
  china: { label: 'Ships from China warehouse', short: 'China stock', tone: 'info' },
  preorder: { label: 'Pre-order — longer delivery', short: 'Pre-order', tone: 'warn' },
  oos: { label: 'Out of stock', short: 'Out of stock', tone: 'bad' },
}

// [id, title, pitch, category, price, refPrice|null, rating, reviews, sold, emoji, stock, qty, colors, sizes, daysAgo, tags]
const RAW = [
  ['p1', 'TWS Wireless Earbuds Pro, ENC Noise Cancelling', '30hr battery with charging case, IPX5 sweat-proof', 'electronics', 14500, 21000, 4.6, 1284, 9800, '🎧', 'nigeria', 340, ['Black', 'White', 'Mint'], null, 40, ['audio', 'bluetooth', 'earphones']],
  ['p2', '20000mAh Fast-Charge Power Bank, 22.5W', 'Charges a phone 4x — built for NEPA days', 'electronics', 18900, null, 4.7, 2210, 15400, '🔋', 'nigeria', 520, ['Black', 'Blue'], null, 90, ['charger', 'battery', 'powerbank']],
  ['p3', 'Magnetic Car Phone Holder, 360° Rotation', 'Strong N52 magnets, fits all air vents', 'auto', 4200, 6000, 4.4, 860, 6100, '🧲', 'nigeria', 210, ['Black', 'Silver'], null, 60, ['car', 'mount', 'phone']],
  ['p4', '65W GaN USB-C Charger, 3 Ports', 'Charge laptop, phone and earbuds at once', 'electronics', 16500, null, 4.8, 640, 3300, '⚡', 'transit', 0, ['White'], null, 8, ['charger', 'laptop', 'usb-c']],
  ['p5', 'Smart Watch with Calls & Heart-Rate', '1.96" AMOLED, 100+ sport modes, 7-day battery', 'electronics', 28500, 39000, 4.3, 1520, 7200, '⌚', 'nigeria', 95, ['Black', 'Pink', 'Silver'], null, 20, ['watch', 'fitness', 'smartwatch']],
  ['p6', 'LED Ring Light 10" with Tripod Stand', '3 colour modes, phone clip, remote shutter', 'electronics', 12800, null, 4.5, 970, 5100, '💡', 'china', 800, ['Black'], null, 120, ['light', 'content', 'tiktok']],
  ['p7', 'Rechargeable Mini Fan, 4 Speeds', 'Desk, handheld or neck — 12hr runtime', 'home', 6900, 9500, 4.6, 3120, 22800, '🌀', 'nigeria', 1200, ['White', 'Pink', 'Green'], null, 15, ['fan', 'cooling', 'rechargeable']],
  ['p8', 'Non-Stick Granite Frying Pan Set (3pcs)', '20/24/28cm, induction ready, PFOA-free', 'home', 24500, null, 4.7, 540, 2100, '🍳', 'nigeria', 60, ['Grey', 'Cream'], null, 75, ['kitchen', 'pan', 'cookware']],
  ['p9', 'Electric Rechargeable Blender, Portable', '6 blades, smoothie on the go, USB-C', 'home', 9800, 14000, 4.2, 1880, 11300, '🥤', 'nigeria', 400, ['Pink', 'Blue', 'White'], null, 30, ['blender', 'kitchen', 'juice']],
  ['p10', 'Vacuum Storage Bags (8 pack) + Pump', 'Saves 80% wardrobe space', 'home', 7500, null, 4.5, 720, 4400, '🧺', 'china', 900, null, null, 140, ['storage', 'organization']],
  ['p11', 'Solar Motion-Sensor Wall Light (2 pack)', '100 LEDs, waterproof, no wiring', 'home', 11200, 15500, 4.4, 1310, 8700, '🔆', 'nigeria', 260, null, null, 5, ['solar', 'light', 'security']],
  ['p12', 'Kitchen Spice Rack Organizer, 3-Tier', 'Rotating, fits 24 jars', 'home', 8300, null, 4.3, 290, 1300, '🧂', 'preorder', 0, ['White', 'Black'], null, 3, ['kitchen', 'organization']],
  ['p13', 'Unisex Oversized Cotton T-Shirt', '230gsm heavyweight cotton, drop shoulder', 'men', 6500, null, 4.5, 2040, 13200, '👕', 'nigeria', 700, ['Black', 'White', 'Sand', 'Olive'], ['S', 'M', 'L', 'XL', 'XXL'], 25, ['shirt', 'tee', 'clothing']],
  ['p14', 'Crossbody Sling Bag, Anti-Theft', 'Water-resistant, USB charging port', 'women', 9900, 13500, 4.6, 880, 5600, '👜', 'nigeria', 180, ['Black', 'Grey', 'Brown'], null, 55, ['bag', 'travel']],
  ['p15', 'Polarized Sunglasses UV400', 'Lightweight TR90 frame with case', 'women', 5200, null, 4.2, 610, 4900, '🕶️', 'china', 1500, ['Black', 'Tortoise'], null, 200, ['glasses', 'sun']],
  ['p16', 'Men\'s Breathable Running Sneakers', 'Cushioned sole, knit upper', 'men', 19500, 26000, 4.4, 730, 3800, '👟', 'nigeria', 120, ['Black', 'White', 'Grey'], ['40', '41', '42', '43', '44', '45'], 18, ['shoes', 'sneakers', 'running']],
  ['p17', 'Silk Satin Hair Bonnet, Double Layer', 'Protects braids & natural hair overnight', 'beauty', 3500, null, 4.8, 4100, 31000, '🎀', 'nigeria', 2000, ['Black', 'Wine', 'Pink', 'Gold'], null, 100, ['hair', 'bonnet', 'satin']],
  ['p18', 'Ionic Hair Dryer Brush 3-in-1', 'Dry, straighten and volumise', 'beauty', 21500, 29000, 4.5, 950, 4200, '💇', 'transit', 0, ['Pink', 'Black'], null, 12, ['hair', 'dryer', 'styling']],
  ['p19', 'Makeup Brush Set (14pcs) + Pouch', 'Soft synthetic bristles, vegan', 'beauty', 6200, null, 4.6, 1150, 7700, '🖌️', 'nigeria', 340, ['Rose Gold', 'Black'], null, 70, ['makeup', 'brush']],
  ['p20', 'LED Lighted Vanity Mirror, Touch Dimmer', '10x magnifying, USB rechargeable', 'beauty', 13900, null, 4.4, 480, 2300, '🪞', 'china', 600, ['White'], null, 6, ['mirror', 'makeup']],
  ['p21', 'Resistance Bands Set (5 levels)', 'Latex-free, door anchor + handles', 'fitness', 8900, 12000, 4.6, 670, 3900, '💪', 'nigeria', 250, null, null, 45, ['gym', 'workout', 'bands']],
  ['p22', 'Digital Body Weight Scale', 'High-precision sensors, 180kg', 'fitness', 9500, null, 4.5, 1020, 6600, '⚖️', 'nigeria', 330, ['Black', 'White'], null, 85, ['scale', 'weight', 'health']],
  ['p23', 'Non-Slip Yoga Mat 10mm + Strap', 'Extra thick, eco TPE', 'fitness', 11500, null, 4.7, 390, 1800, '🧘', 'china', 400, ['Purple', 'Teal', 'Black'], null, 9, ['yoga', 'mat', 'exercise']],
  ['p24', 'Car Vacuum Cleaner, Cordless 8000Pa', 'Wet & dry, HEPA filter', 'auto', 15800, 21000, 4.3, 560, 2900, '🚙', 'nigeria', 90, ['Black'], null, 35, ['car', 'vacuum', 'cleaning']],
  ['p25', 'Dash Cam 1080p Front & Rear', 'Night vision, loop recording, G-sensor', 'auto', 27500, null, 4.4, 410, 1500, '📹', 'preorder', 0, ['Black'], null, 2, ['car', 'camera', 'dashcam']],
  ['p26', 'Cordless Drill Driver 21V Kit', '2 batteries, 29 bits, carry case', 'tools', 32500, 45000, 4.6, 820, 3100, '🔩', 'nigeria', 70, ['Orange', 'Green'], null, 50, ['drill', 'tools', 'diy']],
  ['p27', 'Precision Screwdriver Set (115-in-1)', 'Magnetic, for phones, laptops & glasses', 'tools', 7200, null, 4.8, 1460, 9200, '🪛', 'nigeria', 500, null, null, 130, ['repair', 'screwdriver', 'phone']],
  ['p28', 'Digital Multimeter, Auto-Ranging', 'AC/DC voltage, continuity, NCV', 'tools', 8600, null, 4.5, 330, 1700, '📟', 'china', 300, null, null, 160, ['electrical', 'meter']],
  ['p29', 'Building Blocks City Set (1,200pcs)', 'Compatible with major brands, age 6+', 'toys', 17500, 23000, 4.7, 640, 2600, '🧱', 'nigeria', 110, null, null, 28, ['kids', 'blocks', 'lego']],
  ['p30', 'RC Stunt Car, 360° Flip, Rechargeable', '2.4GHz, LED lights, 30min play', 'toys', 14200, null, 4.4, 890, 4300, '🏎️', 'china', 450, ['Red', 'Blue'], null, 11, ['kids', 'rc', 'car']],
  ['p31', 'LCD Writing Tablet for Kids 12"', 'One-tap erase, no paper', 'toys', 4500, 6500, 4.6, 2300, 16500, '🖍️', 'nigeria', 900, ['Blue', 'Pink'], null, 65, ['kids', 'drawing', 'tablet']],
  ['p32', 'Ergonomic Laptop Stand, Aluminium', 'Adjustable height, foldable', 'office', 10500, null, 4.7, 1180, 6900, '💻', 'nigeria', 280, ['Silver', 'Space Grey'], null, 95, ['laptop', 'desk', 'work']],
  ['p33', 'Wireless Keyboard & Mouse Combo', 'Silent keys, 2.4GHz, 12-month battery', 'office', 13500, 17500, 4.4, 760, 3500, '⌨️', 'nigeria', 150, ['Black', 'White'], null, 42, ['keyboard', 'mouse', 'computer']],
  ['p34', 'Gel Pens Set (60 colours) + Case', 'Glitter, pastel and metallic', 'office', 4900, null, 4.5, 520, 3200, '🖊️', 'china', 1000, null, null, 180, ['pens', 'school', 'stationery']],
  ['p35', 'Expandable Hard-Shell Luggage 24"', '360° spinner wheels, TSA lock', 'travel', 42000, 55000, 4.5, 310, 980, '🧳', 'nigeria', 40, ['Black', 'Navy', 'Champagne'], null, 22, ['luggage', 'suitcase', 'travel']],
  ['p36', 'Universal Travel Adapter, 4 USB', 'Works in 150+ countries', 'travel', 7800, null, 4.6, 450, 2500, '🔌', 'nigeria', 230, ['White', 'Black'], null, 110, ['adapter', 'plug', 'travel']],
  ['p37', 'Neck Pillow, Memory Foam + Eye Mask', 'Washable cover, travel pouch', 'travel', 5800, null, 4.3, 380, 2400, '😴', 'oos', 0, ['Grey', 'Navy'], null, 150, ['travel', 'pillow', 'sleep']],
  ['p38', 'Automatic Pet Water Fountain 2.5L', 'Triple filter, quiet pump', 'pet', 12500, 16000, 4.5, 270, 1100, '🐱', 'china', 220, ['White', 'Blue'], null, 7, ['cat', 'dog', 'water']],
  ['p39', 'Pet Grooming Glove (pair)', 'Gentle de-shedding, 259 tips', 'pet', 3200, null, 4.4, 640, 5100, '🐶', 'nigeria', 600, ['Blue', 'Grey'], null, 80, ['dog', 'cat', 'grooming']],
  ['p40', 'Phone Tripod Selfie Stick, Bluetooth', 'Extends to 1.5m, detachable remote', 'electronics', 6800, 9000, 4.5, 2650, 19800, '🤳', 'nigeria', 800, ['Black', 'White'], null, 48, ['selfie', 'tripod', 'phone']],
  ['p41', 'Men\'s Slim-Fit Stretch Chinos', 'Soft cotton twill with 2% stretch, tapered leg', 'men', 13500, 18000, 4.5, 540, 3100, '👖', 'nigeria', 260, ['Khaki', 'Navy', 'Black', 'Olive'], ['30', '32', '34', '36', '38'], 20, ['trousers', 'pants', 'chinos', 'men']],
  ['p42', 'Men\'s African Print Short-Sleeve Shirt', 'Breathable cotton, bold wax-print pattern', 'men', 11800, null, 4.6, 420, 2700, '👔', 'nigeria', 190, ['Orange/Blue', 'Green/Gold', 'Purple/Black'], ['S', 'M', 'L', 'XL', 'XXL'], 9, ['ankara', 'shirt', 'native', 'men']],
  ['p43', 'Men\'s Genuine Leather Belt, Pin Buckle', 'Full-grain leather, 3.5cm width, gift box', 'men', 7200, 9500, 4.4, 360, 2900, '🪢', 'china', 800, ['Brown', 'Black'], ['32', '34', '36', '38', '40'], 70, ['belt', 'leather', 'men', 'accessories']],
  ['p44', 'Men\'s Piqué Polo Shirt, 2-Pack', 'Cotton piqué, ribbed collar, keeps shape after washing', 'men', 12900, null, 4.5, 610, 4100, '👕', 'nigeria', 75, ['Black/White', 'Navy/Grey', 'Green/Grey'], ['S', 'M', 'L', 'XL', 'XXL'], 33, ['polo', 'shirt', 'men']],
  ['p45', 'Women\'s Ankara Print Midi Dress', 'Wrap waist, flutter sleeves, fully lined', 'women', 16500, 22000, 4.7, 730, 3600, '👗', 'nigeria', 210, ['Sunset', 'Royal Blue', 'Emerald'], ['S', 'M', 'L', 'XL'], 6, ['dress', 'ankara', 'native', 'women']],
  ['p46', 'Women\'s Flat Strappy Sandals', 'Cushioned footbed, adjustable ankle strap', 'women', 8900, null, 4.4, 480, 3300, '👡', 'china', 900, ['Tan', 'Black', 'White'], ['37', '38', '39', '40', '41'], 45, ['sandals', 'shoes', 'women']],
  ['p47', 'Women\'s Leather-Look Tote Bag', 'Fits a 14" laptop, inner zip pocket', 'women', 14800, 19500, 4.6, 520, 2800, '👜', 'transit', 300, ['Tan', 'Black', 'Burgundy'], null, 14, ['bag', 'tote', 'handbag', 'women']],
  ['p48', 'Women\'s Structured Handbag, Gold Buckle', 'Top handle plus detachable shoulder strap', 'women', 17900, null, 4.5, 290, 1500, '👛', 'nigeria', 85, ['Grey', 'Black', 'Pink'], null, 27, ['handbag', 'bag', 'women']],
  ['p49', 'Boys\' Printed Shirt & Shorts Set', 'Cotton shirt with matching shorts, ages 3–10', 'kids', 8500, 11000, 4.6, 340, 2300, '🩳', 'nigeria', 240, ['Navy Floral', 'Grey Leaf'], ['3-4Y', '5-6Y', '7-8Y', '9-10Y'], 12, ['boys', 'kids', 'set', 'outfit']],
  ['p50', 'Girls\' Party Dress with Bow Sash', 'Soft lining, twirl skirt, ages 3–10', 'kids', 10500, null, 4.7, 410, 2600, '👗', 'nigeria', 160, ['Red', 'Yellow', 'Pink'], ['3-4Y', '5-6Y', '7-8Y', '9-10Y'], 30, ['girls', 'kids', 'dress', 'party']],
  ['p51', 'Kids\' Velcro Sneakers, Non-Slip', 'Easy on-off straps, light rubber sole', 'kids', 9800, 12500, 4.5, 380, 2400, '👟', 'china', 700, ['Blue', 'Pink', 'White'], ['26', '28', '30', '32', '34'], 52, ['kids', 'shoes', 'sneakers']],
  ['p52', 'Kids\' Cotton Pyjama Set, 2-Pack', 'Long sleeves, breathable for warm nights', 'kids', 7900, null, 4.6, 260, 1900, '🛌', 'nigeria', 60, ['Pink/Grey', 'Blue/Grey'], ['3-4Y', '5-6Y', '7-8Y'], 40, ['kids', 'pyjamas', 'sleepwear']],
  ['p53', 'Baby Cotton Romper Set (5 pcs)', '100% cotton, snap buttons for easy changes', 'kiddies', 9500, 13000, 4.8, 650, 4800, '🍼', 'nigeria', 320, ['Neutral', 'Blue', 'Pink'], ['0-3M', '3-6M', '6-12M', '12-18M'], 16, ['baby', 'romper', 'onesie', 'newborn']],
  ['p54', 'Ergonomic Baby Carrier, 4 Positions', 'Padded straps and lumbar support, 3.5–15kg', 'kiddies', 18500, 24000, 4.7, 290, 1300, '🤱', 'transit', 150, ['Grey', 'Black', 'Khaki'], null, 8, ['baby', 'carrier', 'sling']],
  ['p55', 'Baby Knit Soft-Sole Shoes', 'Gentle on growing feet, anti-slip dots', 'kiddies', 4200, null, 4.6, 340, 2700, '🧦', 'china', 1100, ['Pink', 'Cream', 'Blue'], ['0-6M', '6-12M', '12-18M'], 60, ['baby', 'shoes', 'booties']],
  ['p56', 'Muslin Swaddle Blankets, 3-Pack', 'Breathable bamboo-cotton, 120 × 120cm', 'kiddies', 8800, 11500, 4.8, 470, 3500, '🧸', 'nigeria', 90, ['Sage/Cream', 'Lilac/White'], null, 22, ['baby', 'blanket', 'swaddle', 'newborn']],
]

// Product photography — free-to-use photos from Unsplash (unsplash.com/license),
// served from Unsplash's image CDN. First image is the cover.
const IMAGES = {
  p1: ['1606220588913-b3aacb4d2f46', '1606220945770-b5b6c2c55bf1', '1572569511254-d8f925fe2cbb', '1606841837239-c5a1a4a07af7'],
  p2: ['1566554738544-d962991c3fee', '1592318348310-f31b61a931c8', '1557767382-97b28f5488e7', '1585995603413-eb35b5f4a50b'],
  p3: ['1536825591064-574efec257f2', '1674385404267-897dafdc6d42', '1764347923709-fc48487f2486', '1619741982598-7cb8a7959476'],
  p4: ['1583863788434-e58a36330cf0', '1725304382197-663ae3864750', '1586254116951-5263e2cdb44c', '1619459072761-496c0812331b'],
  p5: ['1579586337278-3befd40fd17a', '1546868871-7041f2a55e12', '1624096104992-9b4fa3a279dd', '1508685096489-7aacd43bd3b1'],
  p6: ['1673196649671-eb09066ad6c1', '1598358532244-6480b5c5ea1a', '1718874380569-7a44071f01c3', '1478826160983-e6db8c7d537a'],
  p7: ['1564510182791-29645da7fac4', '1718815416565-c65944a5ec14', '1565151443833-29bf2ba5dd8d', '1568392816241-44d223d4d490'],
  p8: ['1592156328697-079f6ee0cfa5', '1592156328757-ae2941276b2c', '1612487439139-c2d7bac13577', '1621494547944-5ddbc84514b2'],
  p9: ['1573613442206-fbbc2a5c487f', '1573613441974-e89ab51c7bd7', '1575499331636-6394e5ae7019', '1536304447766-da0ed4ce1b73'],
  p10: ['1604176354204-9268737828e4', '1567113463300-102a7eb3cb26', '1472666260353-23210544cdf1', '1630329273801-8f629dba0a72'],
  p11: ['1759244565845-674b4454c27b', '1688419140115-b74029f5f24d', '1705354154299-1fc2d030fa15', '1777529956094-f41c95ac02db'],
  p12: ['1546694996-6d1102a72889', '1546314066-f1ce0da10ff5', '1757802261964-a8e03ed98981', '1580116270858-8a0d62b15426'],
  p13: ['1627225925683-1da7021732ea', '1627225924765-552d49cf47ad', '1627225793904-a2f900a6e4cf', '1661110546797-d86cc72a2765'],
  p14: ['1761126081746-2b2b831b43ba', '1760624294514-ca40aafe3d96', '1657603719375-8ffdacaac790', '1636546113485-7658e3a2d067'],
  p15: ['1572635196237-14b3f281503f', '1511499767150-a48a237f0083', '1577803645773-f96470509666', '1584036553516-bf83210aa16c'],
  p16: ['1542291026-7eec264c27ff', '1571008887538-b36bb32f4571', '1709258228137-19a8c193be39', '1597892657493-6847b9640bac'],
  p17: ['1681597107084-0d7f22e3225d', '1681597107753-58e48bb38c32', '1649967322800-5f215ed89863', '1606772016409-d4a55e32be6e'],
  p18: ['1522336284037-91f7da073525', '1715220169023-c1d5c8d2be37', '1734111719430-fe4a3973f8af', '1712481846916-8f73ffc2067a'],
  p19: ['1596462502278-27bfdc403348', '1620464003286-a5b0d79f32c2', '1516975080664-ed2fc6a32937', '1704621354138-e124277356f2'],
  p20: ['1551723454-7565a1f5b161', '1701421052815-a66c64693978', '1784653549738-d787df442af4', '1642800323135-7902f3d5eb88'],
  p21: ['1584735935682-2f2b69dff9d2', '1783632895890-a3b05fae1754', '1783632869722-7aff492c0988', '1610720991840-457ad2c7a658'],
  p22: ['1646829873498-e874cfa27933', '1522844990619-4951c40f7eda', '1758292960017-b8f97616fc3c'],
  p23: ['1646239646963-b0b9be56d6b5', '1637157216470-d92cd2edb2e8', '1552196563-55cd4e45efb3', '1641913640860-ab4c2bfb2bb0'],
  p24: ['1746645297698-306ef29852ca', '1765970101654-337b573142fb', '1765970101634-9cb341a94ea0', '1778062868127-de21087a72c8'],
  p25: ['1765959106936-851735565c12', '1643686978040-beac9782e58b', '1643686978109-499f1e9d4bd1', '1468510634867-6747418867dc'],
  p26: ['1504148455328-c376907d081c', '1572981779307-38b8cabb2407', '1622044939413-0b829c342434', '1590635023142-73c3d34f2805'],
  p27: ['1770386582823-3a7094e35b22', '1581244250633-ebf0f5609f6f', '1729144345962-14ae798ffddd', '1715322554946-1b22a9800aec'],
  p28: ['1758295746012-41650245a9bb', '1710194572710-bbd92a2d3f9c', '1758295745926-88faff7ec2f2', '1777042510267-2c0543a0d715'],
  p29: ['1587654780291-39c9404d746b', '1603558431750-dfa36513aee6', '1560113562-a0a37ada6d91', '1633469924738-52101af51d87'],
  p30: ['1727622738048-29e6f37b2a8c', '1727622738037-65923e2319d9', '1579271723124-a758848c2753', '1591438252948-fa5dd3701c2a'],
  p31: ['1617377222336-ac1b52ad8a13', '1704748082631-84621da1dc59', '1614712201488-9942af86b87b', '1617117206620-b01f2919ff86'],
  p32: ['1641057350568-babe1e84aedf', '1613734661939-9bd1f5f83644', '1575909812057-f04aaf52a9e1', '1615983234885-918e049a2254'],
  p33: ['1652850494316-3d30b01debca', '1510674485131-dc88d96369b4', '1561112078-7d24e04c3407', '1602726428221-9af5b227ed5d'],
  p34: ['1522363890879-4bf9c65ee3f8', '1521669145854-0bd392445939', '1590761131910-614cda70445f', '1654608904845-7872f07475bc'],
  p35: ['1670888664952-efff442ec0d2', '1639598003276-8a70fcaaad6c', '1670888616427-764112453941', '1670888616597-53457e54b61b'],
  p36: ['1517320069935-381614f8c1e5', '1763161786687-43d0c9babdf0', '1564517945244-d371c925640b', '1565049981953-379c9c2a5d48'],
  p37: ['1706819399603-428b06afe3fc', '1654801816121-2beac3d9af53', '1727129533460-ba642fc57f09', '1767889872090-4ac6bd1a68e8'],
  p38: ['1772800562154-2a321e304f19', '1571131116858-2295ade82a72', '1765110278353-3ef4d7af67f6', '1682974439489-429ea55c184f'],
  p39: ['1528846104175-4fd300ee59da', '1625279138876-8910c2af9a30', '1727510190155-51abda425a82', '1611173622933-91942d394b04'],
  p40: ['1522860747050-bb0c1af38ae9', '1588728670720-40153449cc89', '1723975573680-786a7503db3f', '1576299090369-9067e4adca28'],
  p41: ['1473966968600-fa801b869a1a', '1626557981101-aae6f84aa6ff', '1584865288642-42078afe6942'],
  p42: ['1623678011430-7a44a120a2c0', '1763823133159-c6f8ec380e33', '1763823132558-cbff67da4beb'],
  p43: ['1664286074176-5206ee5dc878', '1711443982852-b3df5c563448', '1637868796504-32f45a96d5a0'],
  p44: ['1586363104862-3a5e2ab60d99', '1720514496161-914011a9ee02', '1714317438040-0e8584215699'],
  p45: ['1784160053635-424cf07f567c', '1709809081557-78f803ce93a0', '1696962678565-bee84e6b9cb6'],
  p46: ['1732708862549-714f7478ca31', '1619510331283-a46c425e48bb', '1512664401326-cd1a54ccd52d'],
  p47: ['1760624294582-5341f33f9fa4', '1624687943971-e86af76d57de', '1760624294469-550753ec203a'],
  p48: ['1605733513597-a8f8341084e6', '1705909237050-7a7625b47fac', '1681747685985-a401c271156c'],
  p49: ['1502451885777-16c98b07834a', '1747871734424-c6c33331423a', '1519238263530-99bdd11df2ea'],
  p50: ['1578897367107-2828e351c8a8', '1578897366846-358bb1c2412a', '1611003967145-fb3960072424'],
  p51: ['1678192568478-9488ee55def6', '1678192569393-c7aff066e5bd', '1552912276-56ef47874741'],
  p52: ['1771419912747-df33d91c329d', '1558576997-eac36a2f8c7a'],
  p53: ['1622290319146-7b63df48a635', '1617331140180-e8262094733a', '1766918780914-5df4a5a98c44'],
  p54: ['1685633224499-dd3759500e8f', '1564149809912-731909a19d89', '1633379204542-430941769df3'],
  p55: ['1513091250092-b06c2b7981bc', '1766918780914-e19d9de76d85'],
  p56: ['1636152218161-d91b0e0f585c', '1566004100631-35d015d6a491', '1587116215900-bb2bba7c7cff'],
}

// Square, compressed, auto-format (WebP/AVIF) crops sized for where they're shown
export const imgUrl = (key, w = 480) => (key.includes('://') || key.startsWith('data:') ? key : `https://images.unsplash.com/photo-${key}?auto=format&fit=crop&w=${w}&h=${w}&q=70`) // full URLs (admin-added products) pass through
export const imagesFor = (id) => IMAGES[id] || []

const SPECS_BY_CAT = {
  electronics: (p) => ({ Brand: 'Oja Select', Connectivity: 'Bluetooth 5.3 / USB-C', Warranty: '6 months Oja warranty', Weight: '180 g', Origin: 'Shenzhen, China' }),
  home: () => ({ Material: 'Food-grade ABS / aluminium', Power: 'USB-C rechargeable or N/A', Warranty: '3 months', Origin: 'Guangzhou, China' }),
  men: () => ({ Material: 'Cotton / leather / TR90 (see title)', Fit: 'True to size — see size guide', Care: 'Machine wash cold, inside out', Origin: 'Guangzhou, China' }),
  women: () => ({ Material: 'Cotton / PU leather (see title)', Fit: 'True to size — see size guide', Care: 'Hand wash cold', Origin: 'Yiwu, China' }),
  kids: () => ({ 'Age range': '3–12 years', Material: 'Cotton blend, skin-friendly dyes', Care: 'Machine wash cold', Origin: 'Huzhou, China' }),
  kiddies: () => ({ 'Age range': '0–36 months', Material: '100% cotton or bamboo blend, baby-safe dyes', Care: 'Wash before first use', Origin: 'Huzhou, China' }),
  beauty: () => ({ Material: 'Skin-safe synthetic', Certification: 'NAFDAC-eligible category', Origin: 'Guangzhou, China' }),
  fitness: () => ({ Material: 'TPE / latex-free', 'Max load': 'See listing', Origin: 'Ningbo, China' }),
  auto: () => ({ Compatibility: 'Universal (12V)', Warranty: '6 months', Origin: 'Shenzhen, China' }),
  tools: () => ({ Material: 'S2 steel / ABS housing', Warranty: '12 months', Origin: 'Yongkang, China' }),
  toys: () => ({ 'Age range': '6+ years', 'Safety': 'Non-toxic ABS, EN71 tested', Origin: 'Shantou, China' }),
  office: () => ({ Material: 'Aluminium / ABS', Warranty: '6 months', Origin: 'Ningbo, China' }),
  travel: () => ({ Material: 'PC / ABS', Warranty: '12 months', Origin: 'Pinghu, China' }),
  pet: () => ({ Material: 'BPA-free plastic / silicone', Origin: 'Hangzhou, China' }),
}

const NOW = Date.now()
const DAY = 86400000

export const PRODUCTS = RAW.map(([id, title, pitch, category, price, ref, rating, reviews, sold, emoji, stock, qty, colors, sizes, daysAgo, tags], i) => {
  const cat = CATEGORIES.find((c) => c.id === category)
  // Landed cost breakdown (PRD §12) in NGN — product cost is ~45% of price
  const productCost = Math.round(price * 0.42)
  const landed = {
    productCost,
    chinaLogistics: Math.round(price * 0.03),
    freight: Math.round(price * 0.09),
    insurance: Math.round(price * 0.01),
    customs: Math.round(price * 0.07),
    handling: Math.round(price * 0.03),
    ops: Math.round(price * 0.05),
    fxRate: 214.6, // NGN per CNY snapshot
    sourceCurrency: 'CNY',
    sourceCost: +(productCost / 214.6).toFixed(2),
  }
  landed.total = landed.productCost + landed.chinaLogistics + landed.freight + landed.insurance + landed.customs + landed.handling + landed.ops
  return {
    id, title, pitch, category, price, refPrice: ref, rating, reviews, sold, emoji, stock, qty,
    hue: (cat.hue + i * 17) % 360,
    images: IMAGES[id] || [],
    variants: { color: colors, size: sizes },
    createdAt: NOW - daysAgo * DAY,
    tags,
    sku: `OJ-${category.slice(0, 3).toUpperCase()}-${String(1000 + i * 7)}`,
    specs: SPECS_BY_CAT[category](),
    inBox: ['1 × ' + title.split(',')[0], 'User manual (English)', ...(category === 'electronics' ? ['USB-C cable'] : [])],
    returnable: !['beauty'].includes(category) || id === 'p20',
    landed,
    supplier: ['Shenzhen Jiaxin Trading', 'Yiwu Bright Star Co.', 'Guangzhou Huamei Ltd', 'Ningbo Kaida Industrial'][i % 4],
    moq: [50, 100, 200, 30][i % 4],
    leadDays: [5, 7, 10, 4][i % 4],
    published: true,
    eligibility: 'approved',
  }
})

export const productById = (id) => PRODUCTS.find((p) => p.id === id)

// Products added from the operations dashboard. `input` is what the New product form saves.
const LANDED_SHARES = { productCost: 0.42, chinaLogistics: 0.03, freight: 0.09, insurance: 0.01, customs: 0.07, handling: 0.03, ops: 0.05 }
// Landed cost breakdown from a per-unit total (same shares as the seed catalog)
export function landedFrom(total) {
  const share = Object.values(LANDED_SHARES).reduce((a, b) => a + b, 0)
  const l = Object.fromEntries(Object.entries(LANDED_SHARES).map(([k, r]) => [k, Math.round((total * r) / share)]))
  return { ...l, fxRate: 214.6, sourceCurrency: 'CNY', sourceCost: +(l.productCost / 214.6).toFixed(2), total }
}
// Applies dashboard edits to the shared catalog so search, feeds and product pages see them
export function patchProduct(id, patch) {
  const p = PRODUCTS.find((x) => x.id === id)
  if (p && patch) Object.assign(p, patch.category ? { ...patch, category: catId(patch.category) } : patch)
}
// 'fashion' was split into men / women / kids / kiddies; older saved data still uses it
const CAT_ALIAS = { fashion: 'women' }
export const catId = (id) => CAT_ALIAS[id] || id
export function buildProduct(input) {
  const cat = CATEGORIES.find((c) => c.id === catId(input.category)) || CATEGORIES[0]
  const landed = landedFrom(input.landedTotal)
  const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean)
  const n = parseInt(input.id.slice(1), 10)
  return {
    id: input.id, title: input.title, pitch: input.pitch || '', category: cat.id, price: input.price, refPrice: input.refPrice || null,
    rating: 0, reviews: 0, sold: 0, emoji: '📦', stock: input.stock, qty: input.qty,
    hue: (cat.hue + n * 17) % 360,
    images: input.images?.length ? input.images : input.image ? [input.image] : [],
    variants: { color: list(input.colors).length ? list(input.colors) : null, size: list(input.sizes).length ? list(input.sizes) : null },
    createdAt: input.createdAt, tags: list(input.tags).map((t) => t.toLowerCase()),
    sku: `OJ-${cat.id.slice(0, 3).toUpperCase()}-${String(1000 + n * 7)}`,
    specs: SPECS_BY_CAT[cat.id](), inBox: ['1 × ' + input.title.split(',')[0], 'User manual (English)'],
    returnable: cat.id !== 'beauty', landed,
    supplier: input.supplier || 'To be confirmed', moq: 50, leadDays: 7, published: input.published, eligibility: 'approved', custom: true,
  }
}
// Adds an admin-created product to the shared catalog so search, feeds and product pages see it
export function registerProduct(input) {
  if (!PRODUCTS.some((p) => p.id === input.id)) PRODUCTS.push(buildProduct(input))
}

// Deterministic mock reviews (verified-purchase only per PRD §15)
const NAMES = ['Chiamaka O.', 'Tunde A.', 'Ngozi E.', 'Ibrahim S.', 'Funmi K.', 'Emeka N.', 'Aisha B.', 'Seyi L.', 'Blessing U.', 'Kunle J.', 'Halima Y.', 'Obinna C.']
const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City']
const BODIES = [
  ['Exactly as described', 'Quality is better than I expected for this price. Packaging was neat and nothing was damaged.'],
  ['Good value', 'Works well. Took a little longer than the fastest estimate but tracking kept me updated the whole way.'],
  ['Very happy', 'Bought one for myself and ordered two more for my sisters. Highly recommend.'],
  ['Decent', 'Does the job. Material feels a bit light but for the price, no complaints.'],
  ['Arrived fast in Lagos', 'Ordered Monday, got it Wednesday. Rider called before arriving. Product is solid.'],
  ['Not bad', 'Colour is slightly different from the photo, but still nice. Customer care responded quickly.'],
  ['Repeat buyer', 'Second time buying this. Still the same quality — consistent.'],
]
export function reviewsFor(p) {
  const n = 7
  const seed = parseInt(p.id.slice(1), 10)
  return Array.from({ length: n }, (_, i) => {
    const k = (seed * 7 + i * 3) % BODIES.length
    const stars = i === 3 ? 3 : i === 5 ? 4 : 5 - ((seed + i) % 4 === 0 ? 1 : 0)
    return {
      id: `${p.id}-r${i}`,
      name: NAMES[(seed + i * 5) % NAMES.length],
      city: CITIES[(seed + i) % CITIES.length],
      stars,
      title: BODIES[k][0],
      body: BODIES[k][1],
      photos: (seed + i) % 3 === 0 ? 2 : 0,
      variant: p.variants.color ? p.variants.color[i % p.variants.color.length] : null,
      helpful: ((seed * 13 + i * 11) % 40) + 1,
      repeat: (seed + i) % 5 === 0,
      delivery: (seed + i) % 6 === 0 ? 3 : 5, // separate fulfillment signal
      date: NOW - (i * 9 + seed) * DAY,
    }
  })
}

export const SUGGESTED_QUERIES = ['power bank', 'earbuds', 'hair bonnet', 'rechargeable fan', 'solar light', 'laptop stand', 'sneakers', 'kitchen']

export const COUPONS = {
  OJA10: { code: 'OJA10', label: '10% off your first order (max ₦5,000)', type: 'percent', value: 10, cap: 5000, min: 10000 },
  FREESHIP: { code: 'FREESHIP', label: 'Free delivery on orders above ₦25,000', type: 'ship', min: 25000 },
  SAVE2K: { code: 'SAVE2K', label: '₦2,000 off orders above ₦30,000', type: 'flat', value: 2000, min: 30000 },
}
