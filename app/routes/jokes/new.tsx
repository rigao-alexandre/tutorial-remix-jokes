/** @format */

import type {ActionFunction, LoaderFunction} from '@remix-run/node';
import {json, redirect} from '@remix-run/node';
import {useActionData, useCatch, Link} from '@remix-run/react';

import {db} from '~/utils/db.server';
import {requireUserId, getUserId} from '~/utils/session.server';

function validateJokeContent(content: string) {
   if (content.length < 10) {
      return `That joke is too short`;
   }
}

function validateJokeName(name: string) {
   if (name.length < 3) {
      return `That joke's name is too short`;
   }
}

type ActionData = {
   formError?: string;
   fieldErrors?: {
      name: string | undefined;
      content: string | undefined;
   };
   fields?: {
      name: string;
      content: string;
   };
};

const badRequest = (data: ActionData) => json(data, {status: 400});

export const loader: LoaderFunction = async ({request}) => {
   const userId = await getUserId(request);
   if (!userId) {
      throw new Response('Unauthorized', {status: 401});
   }
   return json({});
};

export const action: ActionFunction = async ({request}) => {
   const userId = await requireUserId(request);
   const form = await request.formData();
   const name = form.get('name');
   const content = form.get('content');
   if (typeof name !== 'string' || typeof content !== 'string') {
      return badRequest({
         formError: `Form not submitted correctly.`,
      });
   }

   const fieldErrors = {
      name: validateJokeName(name),
      content: validateJokeContent(content),
   };
   const fields = {name, content};
   if (Object.values(fieldErrors).some(Boolean)) {
      return badRequest({fieldErrors, fields});
   }

   const joke = await db.joke.create({data: {...fields, jokesterId: userId}});
   return redirect(`/jokes/${joke.id}`);
};

export default function NewJokeRoute() {
   const actionData = useActionData<ActionData>();

   return (
      <div>
         <p>Add your own hilarious joke</p>
         <form method='post'>
            <div>
               <label>
                  Name:{' '}
                  <input
                     type='text'
                     defaultValue={actionData?.fields?.name}
                     name='name'
                     aria-invalid={Boolean(actionData?.fieldErrors?.name) || undefined}
                     aria-errormessage={actionData?.fieldErrors?.name ? 'name-error' : undefined}
                  />
               </label>
               {actionData?.fieldErrors?.name ? (
                  <p className='form-validation-error' role='alert' id='name-error'>
                     {actionData.fieldErrors.name}
                  </p>
               ) : null}
            </div>
            <div>
               <label>
                  Content:{' '}
                  <textarea
                     defaultValue={actionData?.fields?.content}
                     name='content'
                     aria-invalid={Boolean(actionData?.fieldErrors?.content) || undefined}
                     aria-errormessage={actionData?.fieldErrors?.content ? 'content-error' : undefined}
                  />
               </label>
               {actionData?.fieldErrors?.content ? (
                  <p className='form-validation-error' role='alert' id='content-error'>
                     {actionData.fieldErrors.content}
                  </p>
               ) : null}
            </div>
            <div>
               {actionData?.formError ? (
                  <p className='form-validation-error' role='alert'>
                     {actionData.formError}
                  </p>
               ) : null}
               <button type='submit' className='button'>
                  Add
               </button>
            </div>
         </form>
      </div>
   );
}

export function CatchBoundary() {
   const caught = useCatch();

   if (caught.status === 401) {
      return (
         <div className='error-container'>
            <p>You must be logged in to create a joke.</p>
            <Link to='/login'>Login</Link>
         </div>
      );
   }
}

export function ErrorBoundary() {
   return <div className='error-container'>Something unexpected went wrong. Sorry about that.</div>;
}
