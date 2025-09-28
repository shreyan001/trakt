import { Octokit } from "@octokit/rest";
import axios from 'axios';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN as string;

if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN environment variable is required');
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export interface VerificationResult {
  verified: boolean;
  commitSha: string;
  deployedUrl: string;
  fileMatch: boolean;
  message: string;
  repoFile?: string;
  deployedFile?: string;
  error?: string;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string;
  homepage?: string;
  deploymentUrls: string[];
  vercelUrl?: string;
  netlifyUrl?: string;
  githubPages?: string;
  lastCommit: string;
  branch: string;
}

export async function getRepoCommit(owner: string, repo: string, branch: string = 'main'): Promise<string> {
  try {
    const branchInfo = await octokit.repos.getBranch({ owner, repo, branch });
    return branchInfo.data.commit.sha;
  } catch (error) {
    throw new Error(`Failed to get commit for ${owner}/${repo}@${branch}: ${error}`);
  }
}

export async function getFileContentAtCommit(
  owner: string, 
  repo: string, 
  commitSha: string, 
  path: string
): Promise<string> {
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: commitSha,
    });
    
    if (Array.isArray(response.data)) {
      throw new Error(`Path ${path} is a directory, not a file`);
    }
    
    if ('content' in response.data) {
      return Buffer.from(response.data.content, "base64").toString();
    }
    
    throw new Error(`File ${path} not found or is not a regular file`);
  } catch (error) {
    throw new Error(`Failed to get file content for ${path}: ${error}`);
  }
}

export async function fetchDeployedFile(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Pacter-GitHub-Verifier/1.0'
      }
    });
    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  } catch (error) {
    throw new Error(`Failed to fetch deployed file from ${url}: ${error}`);
  }
}

export async function verifyRepoDeployment({
  owner,
  repo,
  branch = 'main',
  deployedUrl,
  fileToCheck = 'package.json'
}: {
  owner: string;
  repo: string;
  branch?: string;
  deployedUrl: string;
  fileToCheck?: string;
}): Promise<VerificationResult> {
  try {
    console.log(`Starting verification for ${owner}/${repo}@${branch}`);
    console.log(`Deployed URL: ${deployedUrl}`);
    console.log(`File to check: ${fileToCheck}`);

    // Get latest commit hash from the branch
    const commitSha = await getRepoCommit(owner, repo, branch);
    console.log(`Latest commit SHA: ${commitSha}`);

    // Fetch file from GitHub at that commit
    const repoFileContent = await getFileContentAtCommit(owner, repo, commitSha, fileToCheck);
    console.log(`Repo file content length: ${repoFileContent.length}`);

    // Construct deployed file URL
    const deployedFileUrl = `${deployedUrl.replace(/\/$/, '')}/${fileToCheck}`;
    console.log(`Fetching from: ${deployedFileUrl}`);

    // Fetch the same file from the deployed URL
    const deployedFileContent = await fetchDeployedFile(deployedFileUrl);
    console.log(`Deployed file content length: ${deployedFileContent.length}`);

    // Normalize content for comparison (trim whitespace)
    const normalizedRepoContent = repoFileContent.trim();
    const normalizedDeployedContent = deployedFileContent.trim();

    // Compare content
    const fileMatch = normalizedRepoContent === normalizedDeployedContent;

    const result: VerificationResult = {
      verified: fileMatch,
      commitSha,
      deployedUrl,
      fileMatch,
      message: fileMatch
        ? `✅ Deployment matches repo code at commit ${commitSha.substring(0, 7)}`
        : `❌ Deployment does NOT match repo code at commit ${commitSha.substring(0, 7)}`,
      repoFile: normalizedRepoContent.substring(0, 500) + (normalizedRepoContent.length > 500 ? '...' : ''),
      deployedFile: normalizedDeployedContent.substring(0, 500) + (normalizedDeployedContent.length > 500 ? '...' : '')
    };

    console.log(`Verification result: ${result.message}`);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Verification failed: ${errorMessage}`);
    
    return {
      verified: false,
      commitSha: '',
      deployedUrl,
      fileMatch: false,
      message: `❌ Verification failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

// Helper function to parse GitHub URL
export function parseGitHubUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL format. Expected: https://github.com/owner/repo');
  }
  
  const [, owner, repo] = match;
  return { 
    owner, 
    repo: repo.replace(/\.git$/, '') // Remove .git suffix if present
  };
}

// Convenience function that accepts a GitHub URL
export async function verifyDeploymentFromUrl({
  repoUrl,
  branch = 'main',
  deployedUrl,
  fileToCheck = 'package.json'
}: {
  repoUrl: string;
  branch?: string;
  deployedUrl: string;
  fileToCheck?: string;
}): Promise<VerificationResult> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  return verifyRepoDeployment({ owner, repo, branch, deployedUrl, fileToCheck });
}

export async function getRepoInfo(owner: string, repo: string, branch: string = 'main'): Promise<RepoInfo> {
  try {
    // Get repository information
    const repoResponse = await octokit.repos.get({ owner, repo });
    const repoData = repoResponse.data;
    
    // Get latest commit
    const commitSha = await getRepoCommit(owner, repo, branch);
    
    const deploymentUrls: string[] = [];
    let vercelUrl: string | undefined;
    let netlifyUrl: string | undefined;
    let githubPages: string | undefined;
    
    // Check homepage URL
    if (repoData.homepage) {
      deploymentUrls.push(repoData.homepage);
      
      // Detect deployment platform
      if (repoData.homepage.includes('vercel.app')) {
        vercelUrl = repoData.homepage;
      } else if (repoData.homepage.includes('netlify.app')) {
        netlifyUrl = repoData.homepage;
      } else if (repoData.homepage.includes('github.io')) {
        githubPages = repoData.homepage;
      }
    }
    
    // Check for GitHub Pages
    if (repoData.has_pages) {
      const pagesUrl = `https://${owner}.github.io/${repo}`;
      if (!deploymentUrls.includes(pagesUrl)) {
        deploymentUrls.push(pagesUrl);
        githubPages = pagesUrl;
      }
    }
    
    // Try to get package.json for additional deployment info
    try {
      const packageJson = await getFileContentAtCommit(owner, repo, commitSha, 'package.json');
      const packageData = JSON.parse(packageJson);
      
      // Check for homepage in package.json
      if (packageData.homepage && !deploymentUrls.includes(packageData.homepage)) {
        deploymentUrls.push(packageData.homepage);
      }
    } catch (error) {
      // package.json might not exist, that's okay
    }
    
    // Try to get README for deployment URLs
    try {
      const readmeFiles = ['README.md', 'readme.md', 'README.txt', 'readme.txt'];
      for (const readmeFile of readmeFiles) {
        try {
          const readme = await getFileContentAtCommit(owner, repo, commitSha, readmeFile);
          
          // Look for common deployment URL patterns
          const urlPatterns = [
            /https:\/\/[\w-]+\.vercel\.app/g,
            /https:\/\/[\w-]+\.netlify\.app/g,
            /https:\/\/[\w-]+\.github\.io/g,
            /https:\/\/[\w.-]+\.herokuapp\.com/g
          ];
          
          urlPatterns.forEach(pattern => {
            const matches = readme.match(pattern);
            if (matches) {
              matches.forEach(url => {
                if (!deploymentUrls.includes(url)) {
                  deploymentUrls.push(url);
                  
                  if (url.includes('vercel.app') && !vercelUrl) {
                    vercelUrl = url;
                  } else if (url.includes('netlify.app') && !netlifyUrl) {
                    netlifyUrl = url;
                  } else if (url.includes('github.io') && !githubPages) {
                    githubPages = url;
                  }
                }
              });
            }
          });
          
          break; // Found a README, stop looking
        } catch (error) {
          // This README file doesn't exist, try the next one
        }
      }
    } catch (error) {
      // No README found, that's okay
    }
    
    return {
      owner,
      repo,
      description: repoData.description || '',
      homepage: repoData.homepage,
      deploymentUrls,
      vercelUrl,
      netlifyUrl,
      githubPages,
      lastCommit: commitSha,
      branch
    };
    
  } catch (error) {
    throw new Error(`Failed to get repository info for ${owner}/${repo}: ${error}`);
  }
}

export async function getRepoInfoFromUrl(repoUrl: string, branch: string = 'main'): Promise<RepoInfo> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  return getRepoInfo(owner, repo, branch);
}