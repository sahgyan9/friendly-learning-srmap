#!/usr/bin/env node

/**
 * Script to fix canonical URL consistency issues
 * This fixes the "Duplicate, Google chose different canonical than user" issue
 */

const fs = require('fs');
const path = require('path');

// Primary canonical domain
const PRIMARY_DOMAIN = 'https://friendly-learning-srmap.lovable.app';
const OLD_DOMAIN = 'https://www.project-fl.me';

// Function to update sitemap URLs
function updateSitemap() {
    const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');

    if (!fs.existsSync(sitemapPath)) {
        console.log('Sitemap not found, skipping...');
        return;
    }

    let sitemap = fs.readFileSync(sitemapPath, 'utf8');

    // Replace any old domain references with primary domain
    const updatedSitemap = sitemap.replace(
        /https:\/\/www\.project-fl\.me/g,
        PRIMARY_DOMAIN
    );

    fs.writeFileSync(sitemapPath, updatedSitemap);
    console.log('✓ Updated sitemap.xml canonical URLs');
}

// Function to update robots.txt
function updateRobotsTxt() {
    const robotsPath = path.join(__dirname, 'public', 'robots.txt');

    if (!fs.existsSync(robotsPath)) {
        console.log('Robots.txt not found, skipping...');
        return;
    }

    let robots = fs.readFileSync(robotsPath, 'utf8');

    // Ensure all sitemap URLs use the primary domain
    const updatedRobots = robots.replace(
        /Sitemap: https:\/\/www\.project-fl\.me/g,
        `Sitemap: ${PRIMARY_DOMAIN}`
    );

    fs.writeFileSync(robotsPath, updatedRobots);
    console.log('✓ Updated robots.txt sitemap URLs');
}

// Function to check for remaining inconsistencies
function checkForInconsistencies() {
    const srcPath = path.join(__dirname, 'src');
    let inconsistencies = [];

    function searchDirectory(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                searchDirectory(filePath);
            } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                const content = fs.readFileSync(filePath, 'utf8');

                // Look for project-fl.me references
                if (content.includes('www.project-fl.me')) {
                    const lines = content.split('\n');
                    lines.forEach((line, index) => {
                        if (line.includes('www.project-fl.me')) {
                            inconsistencies.push({
                                file: filePath.replace(__dirname, ''),
                                line: index + 1,
                                content: line.trim()
                            });
                        }
                    });
                }
            }
        });
    }

    searchDirectory(srcPath);

    if (inconsistencies.length > 0) {
        console.log('\n⚠️  Found remaining domain inconsistencies:');
        inconsistencies.forEach(item => {
            console.log(`${item.file}:${item.line} - ${item.content}`);
        });
        console.log('\nThese should be manually reviewed and updated if they affect SEO.');
    } else {
        console.log('✓ No remaining domain inconsistencies found in canonical URLs');
    }
}

// Main execution
console.log('🔧 Fixing canonical URL consistency issues...\n');

updateSitemap();
updateRobotsTxt();
checkForInconsistencies();

console.log('\n✅ Canonical URL fix completed!');
console.log('\nNext steps:');
console.log('1. Deploy these changes');
console.log('2. Submit updated sitemap to Google Search Console');
console.log('3. Request re-indexing of affected pages');
console.log('4. Monitor for "Duplicate content" issue resolution');
