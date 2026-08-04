const github = require('@actions/github')

const {
	GITHUB_TOKEN,
	USER,
	REPOSITORY,
	PRODUCTION,
	PR_NUMBER,
	REF,
	LOG_URL,
	PR_LABELS,
	GITHUB_DEPLOYMENT_ENV
} = require('./config')

const init = () => {
	const client = github.getOctokit(GITHUB_TOKEN)

	let deploymentId

	const createDeployment = async () => {
		const deployment = await client.rest.repos.createDeployment({
			owner: USER,
			repo: REPOSITORY,
			ref: REF,
			required_contexts: [],
			environment: GITHUB_DEPLOYMENT_ENV || (PRODUCTION ? 'Production' : 'Preview'),
			description: 'Deploy to Vercel',
			auto_merge: false
		})

		deploymentId = deployment.data.id

		return deployment.data
	}

	const updateDeployment = async (status, url) => {
		if (!deploymentId) return

		const deploymentStatus = await client.rest.repos.createDeploymentStatus({
			owner: USER,
			repo: REPOSITORY,
			deployment_id: deploymentId,
			state: status,
			log_url: LOG_URL,
			environment_url: url || LOG_URL,
			description: 'Starting deployment to Vercel'
		})

		return deploymentStatus.data
	}

	const deleteExistingComment = async () => {
		const { data } = await client.rest.issues.listComments({
			owner: USER,
			repo: REPOSITORY,
			issue_number: PR_NUMBER
		})

		if (data.length < 1) return

		const comment = data.find((comment) => comment.body.includes('This pull request has been deployed to Vercel.'))
		if (comment) {
			await client.rest.issues.deleteComment({
				owner: USER,
				repo: REPOSITORY,
				comment_id: comment.id
			})

			return comment.id
		}
	}

	const createComment = async (body) => {
		// Remove indentation
		const dedented = body.replace(/^[^\S\n]+/gm, '')

		const comment = await client.rest.issues.createComment({
			owner: USER,
			repo: REPOSITORY,
			issue_number: PR_NUMBER,
			body: dedented
		})

		return comment.data
	}

	const addLabel = async () => {
		const label = await client.rest.issues.addLabels({
			owner: USER,
			repo: REPOSITORY,
			issue_number: PR_NUMBER,
			labels: PR_LABELS
		})

		return label.data
	}

	const getCommit = async () => {
		const { data } = await client.rest.repos.getCommit({
			owner: USER,
			repo: REPOSITORY,
			ref: REF
		})

		return {
			authorName: data.commit.author.name,
			authorLogin: data.author.login,
			commitMessage: data.commit.message
		}
	}

	return {
		client,
		createDeployment,
		updateDeployment,
		deleteExistingComment,
		createComment,
		addLabel,
		getCommit
	}
}

module.exports = {
	init
}