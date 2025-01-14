import fs from 'fs'

export function generateReports(data) {
  const {
    packageName,
    metadata: {
      current,
      wanted,
      latest,
      updateType,
      author,
      description,
      repository,
      homepage,
    },
    categorizedNotes,
  } = data

  const header = `# ${packageName} Update Report\n`
  const packageDetails = `
**Description:** ${description || 'No description available'}
**Current Version:** ${current}
**Wanted Version:** ${wanted}
**Latest Version:** ${latest}
**Update Type:** ${updateType}
**Author:** ${author?.name || 'Unknown'} (${
    author?.email || 'No email provided'
  })
**Repository:** [${repository.url}](${repository.url})
**Homepage:** [${homepage}](${homepage})

---

`

  const categorizedNotesSection = categorizedNotes
    .map((note) => {
      const categories = Object.entries(note.categorized)
        .filter(([, items]) => items.length > 0)
        .map(
          ([category, items]) =>
            `### ${
              category.charAt(0).toUpperCase() + category.slice(1)
            }\n- ${items.join('\n- ')}`,
        )
        .join('\n\n')

      return `
## Categorized Notes for Version ${note.version} (Published: ${
        note.published_at
      })
${categories || 'No categorized notes available.'}
`
    })
    .join('\n')

  const markdown = [
    header,
    packageDetails,

    `## Categorized Notes\n`,
    categorizedNotesSection,
  ].join('\n')

  console.log('Markdown report generated as update-report.md')
  fs.writeFileSync(`${packageName}-update-report.md`, markdown)
  return markdown
}
