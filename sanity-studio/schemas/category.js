// sanity-studio/schemas/category.js
export default {
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    },
    {
      name: 'color',
      title: 'Badge Color (hex)',
      type: 'string',
      description: 'e.g. #A3332D — defaults to maroon if blank',
    },
  ],
  preview: {
    select: { title: 'title' },
  },
}
