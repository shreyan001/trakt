import { verifyRepoDeployment, verifyDeploymentFromUrl, VerificationResult } from '@/lib/github/verifyDeployment';

export interface GitHubVerificationState {
  input: string;
  result?: string;
  verificationData?: VerificationResult;
  error?: string;
}

/**
 * LangGraph node for GitHub deployment verification
 * This node can be integrated into your existing graph structure
 */
export async function githubVerificationNode(state: GitHubVerificationState): Promise<Partial<GitHubVerificationState>> {
  try {
    console.log('GitHub Verification Node - Input:', state.input);
    
    // Parse the input to extract verification parameters
    const verificationParams = parseVerificationInput(state.input);
    
    if (!verificationParams) {
      return {
        result: "❌ I couldn't parse the verification request. Please provide either a GitHub URL and deployed URL, or specify owner, repo, and deployed URL.",
        error: "Invalid verification parameters"
      };
    }
    
    // Perform the verification
    let verificationResult: VerificationResult;
    
    if (verificationParams.repoUrl) {
      verificationResult = await verifyDeploymentFromUrl({
        repoUrl: verificationParams.repoUrl,
        branch: verificationParams.branch || 'main',
        deployedUrl: verificationParams.deployedUrl,
        fileToCheck: verificationParams.fileToCheck || 'package.json'
      });
    } else {
      verificationResult = await verifyRepoDeployment({
        owner: verificationParams.owner!,
        repo: verificationParams.repo!,
        branch: verificationParams.branch || 'main',
        deployedUrl: verificationParams.deployedUrl,
        fileToCheck: verificationParams.fileToCheck || 'package.json'
      });
    }
    
    // Format the result for the user
    const formattedResult = formatVerificationResult(verificationResult);
    
    return {
      result: formattedResult,
      verificationData: verificationResult
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('GitHub Verification Node Error:', errorMessage);
    
    return {
      result: `❌ Verification failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

interface VerificationParams {
  repoUrl?: string;
  owner?: string;
  repo?: string;
  deployedUrl: string;
  branch?: string;
  fileToCheck?: string;
}

/**
 * Parse user input to extract verification parameters
 * Supports various input formats
 */
function parseVerificationInput(input: string): VerificationParams | null {
  const lowerInput = input.toLowerCase();
  
  // Check if this is a verification request
  if (!lowerInput.includes('verify') && !lowerInput.includes('check') && !lowerInput.includes('deployment')) {
    return null;
  }
  
  // Extract URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = input.match(urlRegex) || [];
  
  let githubUrl: string | undefined;
  let deployedUrl: string | undefined;
  
  // Identify GitHub URL and deployed URL
  for (const url of urls) {
    if (url.includes('github.com')) {
      githubUrl = url;
    } else {
      deployedUrl = url;
    }
  }
  
  if (!deployedUrl) {
    return null;
  }
  
  // Extract other parameters
  const branchMatch = input.match(/branch[:\s]+([^\s]+)/i);
  const fileMatch = input.match(/file[:\s]+([^\s]+)/i);
  
  const params: VerificationParams = {
    deployedUrl,
    branch: branchMatch ? branchMatch[1] : undefined,
    fileToCheck: fileMatch ? fileMatch[1] : undefined
  };
  
  if (githubUrl) {
    params.repoUrl = githubUrl;
  } else {
    // Try to extract owner/repo from text
    const ownerRepoMatch = input.match(/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/g);
    if (ownerRepoMatch && ownerRepoMatch[0]) {
      const [owner, repo] = ownerRepoMatch[0].split('/');
      params.owner = owner;
      params.repo = repo;
    }
  }
  
  return params;
}

/**
 * Format verification result for user-friendly display
 */
function formatVerificationResult(result: VerificationResult): string {
  let output = `## GitHub Deployment Verification\n\n`;
  
  output += `**Status:** ${result.verified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}\n`;
  output += `**Message:** ${result.message}\n\n`;
  
  if (result.commitSha) {
    output += `**Commit SHA:** \`${result.commitSha}\`\n`;
  }
  
  output += `**Deployed URL:** ${result.deployedUrl}\n`;
  
  if (result.error) {
    output += `**Error:** ${result.error}\n`;
  } else {
    output += `**File Match:** ${result.fileMatch ? '✅ Yes' : '❌ No'}\n`;
    
    if (!result.fileMatch && result.repoFile && result.deployedFile) {
      output += `\n**Differences detected:**\n`;
      output += `- Repo file preview: \`${result.repoFile}\`\n`;
      output += `- Deployed file preview: \`${result.deployedFile}\`\n`;
    }
  }
  
  if (result.verified) {
    output += `\n🎉 **The deployment matches the GitHub repository!** This means the deployed code is authentic and matches the source code in the repository.`;
  } else {
    output += `\n⚠️ **The deployment does not match the GitHub repository.** This could indicate:`;
    output += `\n- The deployment is from a different commit`;
    output += `\n- Local changes were made that aren't in the repo`;
    output += `\n- The file doesn't exist at the deployed URL`;
    output += `\n- There's a configuration or build process difference`;
  }
  
  return output;
}

/**
 * Helper function to determine if input is requesting GitHub verification
 */
export function isGitHubVerificationRequest(input: string): boolean {
  const lowerInput = input.toLowerCase();
  const verificationKeywords = [
    'verify deployment',
    'check deployment',
    'verify github',
    'check github',
    'deployment verification',
    'repo verification',
    'verify repo',
    'check repo'
  ];
  
  return verificationKeywords.some(keyword => lowerInput.includes(keyword)) ||
         (lowerInput.includes('github.com') && (lowerInput.includes('verify') || lowerInput.includes('check')));
}